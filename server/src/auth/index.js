// server/src/auth/index.js
// @ts-check
const { betterAuth } = require('better-auth')
const { drizzleAdapter } = require('better-auth/adapters/drizzle')
const { username } = require('better-auth/plugins')

const config = require('@rm/config')
const { getDrizzle } = require('../db/drizzle')
const schema = require('../db/authSchema')

/**
 * Pure option construction, split out so the wiring can be tested without
 * opening a database connection.
 *
 * @param {{ strategies: any[], sessionSecret: string, baseURL: string }} input
 */
function buildAuthOptions(input) {
  /** @type {Record<string, { clientId: string, clientSecret: string }>} */
  const socialProviders = {}

  for (const strategy of input.strategies) {
    if (!strategy.enabled) continue
    if (strategy.type === 'discord') {
      socialProviders.discord = {
        clientId: strategy.clientId,
        clientSecret: strategy.clientSecret,
      }
    }
  }

  return {
    baseURL: input.baseURL,
    secret: input.sessionSecret,
    emailAndPassword: { enabled: true },
    socialProviders,
    // Point at the prefixed tables. The unprefixed `session` name belongs to
    // express-mysql-session and `users` to the pre-2.0 user table.
    user: { modelName: 'auth_user' },
    session: { modelName: 'auth_session' },
    account: { modelName: 'auth_account' },
    verification: { modelName: 'auth_verification' },
  }
}

/** @type {any} */
let cached = null

function getAuth() {
  if (cached) return cached
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
    ],
  })
  return cached
}

module.exports = { getAuth, buildAuthOptions }
