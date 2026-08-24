// server/src/auth/index.js
// @ts-check
const { betterAuth } = require('better-auth')
const { drizzleAdapter } = require('better-auth/adapters/drizzle')
const { username } = require('better-auth/plugins')

const config = require('@rm/config')
const { getDrizzle } = require('../db/drizzle')
const schema = require('../db/authSchema')
const { telegramPlugin } = require('./telegram')

/**
 * Pure option construction, split out so the wiring can be tested without
 * opening a database connection.
 *
 * @param {{ strategies: any[], sessionSecret: string, baseURL: string }} input
 */
function buildAuthOptions(input) {
  /** @type {Record<string, { clientId: string, clientSecret: string }>} */
  const socialProviders = {}
  let localEnabled = false

  for (const strategy of input.strategies) {
    if (!strategy.enabled) continue
    if (strategy.type === 'discord') {
      socialProviders.discord = {
        clientId: strategy.clientId,
        clientSecret: strategy.clientSecret,
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
      // Staying on bcrypt keeps one format across the migration. Bun.password
      // detects the algorithm from the hash prefix, so this verifies legacy
      // rows and anything written from here on.
      password: {
        hash: (password) => Bun.password.hash(password, 'bcrypt'),
        verify: ({ hash, password }) => Bun.password.verify(password, hash),
      },
    },
    socialProviders,
    // Point at the prefixed tables. The unprefixed `session` name belongs to
    // express-mysql-session and `users` to the pre-2.0 user table.
    user: { modelName: 'auth_user' },
    session: { modelName: 'auth_session' },
    account: { modelName: 'auth_account' },
    verification: { modelName: 'auth_verification' },
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
 * @param {string} pathname
 */
function isAuthRequest(pathname) {
  return (
    pathname === AUTH_ROUTE_PREFIX ||
    pathname.startsWith(`${AUTH_ROUTE_PREFIX}/`)
  )
}

/** @type {any} */
let cached = null

function getAuth() {
  if (cached) return cached
  const telegram = config
    .getSafe('authentication.strategies')
    .find((s) => s.type === 'telegram' && s.enabled)
  cached = betterAuth({
    ...buildAuthOptions({
      strategies: config.getSafe('authentication.strategies'),
      sessionSecret: config.getSafe('api.sessionSecret'),
      baseURL: config.getSafe('api.baseUrl'),
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

module.exports = {
  getAuth,
  buildAuthOptions,
  buildAuthRoutePrefix,
  isAuthRequest,
}
