// server/src/auth/index.ts

import config from '@rm/config'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { username } from 'better-auth/plugins'
// `db/auth-schema.ts` has only named exports (no default) -- `import
// schema from` here would silently bind to `undefined` under real ESM
// (unlike the old CJS `require()`, which returned the whole exports object
// for any default-style destructure). Caught by the typechecker while
// converting this file to real TypeScript.
import * as schema from '../db/auth-schema'
import { getDrizzle } from '../db/drizzle'
import {
  resolveIpAddressStrategy,
  resolveTrustProxy,
} from '../middleware/trust-proxy'
import { hashPassword, verifyPassword } from '../services/local-password'
import { createEnforceMaxSessions } from './max-sessions'
import { createRecomputeUserPerms } from './recompute-perms-on-sign-in'
import { createSignInGateCheck } from './sign-in-gate'
import { telegramPlugin } from './telegram'

// Better Auth's own hard minimum. `config/default.json` used to ship a fixed
// 31-character placeholder -- one character under this floor -- shared by
// every install that never overrode `api.sessionSecret`. That secret now
// signs every session cookie, so a shared or short value is a forgeable
// session, not just a Better Auth warning. Refusing to start is the chosen
// fix over silently generating and persisting one on first boot: this
// codebase has no existing mechanism for writing config files at runtime
// (`packages/config/lib/mutations.js` only ever mutates the in-memory
// config object), and a refusal is loud and unmissable in exactly the way a
// silently-written file would not be, at the cost of requiring every
// upgrading install -- including ones already running the old shipped
// value -- to set a real secret once.
const MIN_SESSION_SECRET_LENGTH = 32

function assertSessionSecret(secret: string) {
  if (!secret || secret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      `api.sessionSecret must be set to a random string of at least ${MIN_SESSION_SECRET_LENGTH} characters -- it now signs every session cookie. Generate one (for example: \`openssl rand -base64 32\`) and set it in your local.json or the API_SESSION_SECRET environment variable.`,
    )
  }
}

/**
 * Pure option construction, split out so the wiring can be tested without
 * opening a database connection.
 *
 */
function buildAuthOptions(input: {
  strategies: any[]
  sessionSecret: string
  baseURL: string
  trustProxy?: boolean | number | string
  cookieAgeDays?: number
  onSessionCreate?: (userId: string) => Promise<void>
  checkSignInGate?: (
    userId: string,
  ) => Promise<{ allow: true } | { allow: false; reason: string }>
  enforceMaxSessions?: (userId: string) => Promise<void>
}) {
  const socialProviders: Record<
    string,
    {
      clientId: string
      clientSecret: string
      scope?: string[]
      redirectURI?: string
    }
  > = {}
  let localEnabled = false

  for (const strategy of input.strategies) {
    if (!strategy.enabled) continue
    if (strategy.type === 'discord') {
      socialProviders.discord = {
        clientId: strategy.clientId,
        clientSecret: strategy.clientSecret,
        // `identify` is one of Better Auth's default Discord scopes and is
        // requested again here for clarity. There is no `guilds` scope: 2.0
        // keeps a Discord bot (`discord-bot-client.js`) that can see guild
        // membership and roles for any account directly, so the OAuth grant
        // never needs to ask the user's own token for it -- one less scope
        // on the consent screen.
        scope: ['identify'],
        // Operators whitelist this exact URL in their Discord app's OAuth2
        // settings. Leaving it unset falls back to Better Auth's own
        // `${baseURL}/callback/discord`, which will not match what most
        // instances have configured.
        ...(strategy.redirectUri && { redirectURI: strategy.redirectUri }),
      }
    }
    if (strategy.type === 'local') {
      localEnabled = true
    }
  }

  return {
    baseURL: input.baseURL,
    secret: input.sessionSecret,
    emailAndPassword: {
      // Gated on the `local` strategy, which defaults to disabled. Leaving this
      // unconditionally true means /api/auth/sign-up/email accepts registrations
      // on an instance whose operator switched local auth off, which is open
      // registration nobody asked for.
      enabled: localEnabled,
      // Better Auth hashes with scrypt by default, storing `salt:hash` hex.
      // ReactMap has always stored bcrypt (`$2b$`, cost 10, originally from
      // bcrypt@5.1.1). Those formats are not interchangeable, so a back-filled
      // hash would insert cleanly and then fail every verification, locking out
      // every local-auth user with no error anywhere to explain it.
      //
      // Staying on bcrypt keeps one format across the migration.
      // `localPassword` (server/src/services/localPassword.js) wraps
      // Bun.password.{hash,verify} with the handling raw Bun.password lacks:
      // bcrypt silently truncated its input at 72 bytes, so a legacy password
      // longer than that no longer matches its own hash under Bun's
      // pre-hashing unless the verify falls back to the truncated bytes.
      // `matchesHash` also swallows a parse failure on a malformed or null
      // hash -- every Discord and Telegram account has one -- turning what
      // would otherwise be a 500 into a clean non-match.
      password: {
        hash: hashPassword,
        verify: ({ hash, password }: { hash: string; password: string }) =>
          verifyPassword(password, hash),
      },
    },
    socialProviders,
    // Better Auth resolves the client IP itself and does NOT consult Express's
    // `trust proxy`. `getIPFromHeader` in @better-auth/core trusts a
    // single-valued `x-forwarded-for` unconditionally when no trusted proxies
    // are configured, so the two layers have to be driven from the same
    // resolved value or they silently disagree about which forwarded header
    // entries are attacker-controlled. `resolveIpAddressStrategy`
    // (`server/src/middleware/trustProxy.js`) is the single place that
    // decides the mapping; see it for `true` / address-CIDR / fallback.
    //
    // The fallback ('socket') case -- `false`, a hop count, or a named
    // Express preset -- consults no forwarded header at all, because none of
    // those can be expressed as Better Auth's address allowlist. That would
    // otherwise leave `auth_session.ip_address` an empty string even for a
    // direct connection, so `server/src/serve.js` overwrites the forwarded
    // header with the real socket address ahead of the Better Auth handler
    // in that case, and this reads it back from the same header name.
    advanced: {
      ipAddress: (() => {
        const strategy = resolveIpAddressStrategy(input.trustProxy || false)
        if (strategy.mode === 'permissive') return {}
        if (strategy.mode === 'trustedProxies') {
          return { trustedProxies: strategy.trustedProxies }
        }
        return { ipAddressHeaders: ['x-forwarded-for'] }
      })(),
    },
    // Point at the prefixed tables. The unprefixed `session` name belongs to
    // express-mysql-session and `users` to the pre-2.0 user table.
    user: { modelName: 'auth_user' },
    session: {
      modelName: 'auth_session',
      // `api.cookieAgeDays` used to be dead config: Better Auth's own 7-day
      // default governed because nothing here read it. `expiresIn` is in
      // seconds, not days -- see @better-auth/core's `SessionOptions` --
      // so the config value is converted here rather than passed through.
      ...(input.cookieAgeDays && {
        expiresIn: input.cookieAgeDays * 24 * 60 * 60,
      }),
    },
    account: { modelName: 'auth_account' },
    verification: { modelName: 'auth_verification' },
    // Passport's `deserializeUser` used to do two things on every sign-in:
    // compute the user's permission set, and refuse the session outright if
    // it lacked map access. Better Auth splits those across the two ends of
    // the same hook, because only one of them can still veto anything by the
    // time it runs.
    //
    // `create.before` is the refusal gate (`checkSignInGate`, added below):
    // it runs before the session row is written and can still reject it, by
    // returning `false`. That is the direct replacement for
    // `done('User does not have map permissions', null)`.
    //
    // `create.after` is the perms recompute (`onSessionCreate`, from Task 2
    // of this plan): it runs once the session already exists, so a failure
    // there must not be allowed to block login -- `user_perms` is downstream
    // of the session, not a precondition for creating it. `enforceMaxSessions`
    // (Task 9 of this plan) shares the same reasoning: the `api.maxSessions`
    // cap trims sessions after the new one is written, so it belongs in this
    // same `after` hook rather than a third hook layer.
    ...((input.onSessionCreate ||
      input.checkSignInGate ||
      input.enforceMaxSessions) && {
      databaseHooks: {
        session: {
          create: {
            ...(input.checkSignInGate && {
              before: async (session: { userId: string }) => {
                const result = await input.checkSignInGate!(session.userId)
                if (!result.allow) return false
              },
            }),
            ...((input.onSessionCreate || input.enforceMaxSessions) && {
              after: async (session: { userId: string }) => {
                if (input.onSessionCreate) {
                  await input.onSessionCreate(session.userId)
                }
                if (input.enforceMaxSessions) {
                  await input.enforceMaxSessions(session.userId)
                }
              },
            }),
          },
        },
      },
    }),
  }
}

const AUTH_ROUTE_PREFIX = '/api/auth'

function buildAuthRoutePrefix() {
  return AUTH_ROUTE_PREFIX
}

/**
 * Passport currently owns `/auth/*`, so better auth is mounted under
 * `/api/auth/*` and the two do not overlap while both are running.
 *
 */
function isAuthRequest(pathname: string) {
  return (
    pathname === AUTH_ROUTE_PREFIX ||
    pathname.startsWith(`${AUTH_ROUTE_PREFIX}/`)
  )
}

let cached: any = null

function getAuth() {
  if (cached) return cached
  assertSessionSecret(config.getSafe('api.sessionSecret'))
  const telegram = config
    .getSafe('authentication.strategies')
    .find((s: any) => s.type === 'telegram' && s.enabled)
  cached = betterAuth({
    ...buildAuthOptions({
      strategies: config.getSafe('authentication.strategies'),
      sessionSecret: config.getSafe('api.sessionSecret'),
      baseURL: config.getSafe('api.baseUrl'),
      trustProxy: resolveTrustProxy(config.getSafe('api.trustProxy')),
      cookieAgeDays: config.getSafe('api.cookieAgeDays'),
      onSessionCreate: createRecomputeUserPerms(),
      checkSignInGate: createSignInGateCheck(),
      enforceMaxSessions: createEnforceMaxSessions(
        config.getSafe('api.maxSessions'),
      ),
    }),
    database: drizzleAdapter(getDrizzle(), {
      provider: 'mysql',
      // The adapter resolves a model by looking up `schema[modelName]`, so the
      // keys have to be the table names, not the camelCase export names. Handing
      // it `authSchema` directly fails at runtime with "The model auth_user was
      // not found in the schema object", and no pure unit test catches it.
      schema: {
        auth_user: schema.authUser,
        auth_session: schema.authSession,
        auth_account: schema.authAccount,
        auth_verification: schema.authVerification,
      },
    }),
    plugins: [
      username({
        // Better Auth defaults to /^[a-zA-Z0-9_.]+$/, min 3, max 30. ReactMap
        // 1.x never validated usernames at all and stores them in a
        // varchar(255), so anyone whose name carries a hyphen, a space or fewer
        // than three characters would be unable to sign in after migrating.
        // These limits exist to preserve every existing login. Tightening the
        // rules for new signups is a product decision, not something to smuggle
        // into a migration.
        minUsernameLength: 1,
        maxUsernameLength: 255,
        usernameValidator: (name) => name.length > 0 && name.length <= 255,
      }),
      ...(telegram ? [telegramPlugin({ botToken: telegram.botToken })] : []),
    ],
  })
  return cached
}

export {
  assertSessionSecret,
  buildAuthOptions,
  buildAuthRoutePrefix,
  getAuth,
  isAuthRequest,
}
