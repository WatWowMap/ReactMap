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
    database: drizzleAdapter(getDrizzle(), { provider: 'mysql', schema }),
    plugins: [username()],
  })
  return cached
}

module.exports = { getAuth, buildAuthOptions }
