/* eslint-disable no-console */

const session = require('express-session')
const MySQLStore = require('express-mysql-session')(session)
const {
  api: { maxSessions },
  database: {
    schemas,
    settings: { sessionTableName },
  },
} = require('./config')
const { Session } = require('../models/index')

const dbSelection = schemas.find(({ useFor }) => useFor?.includes('session'))

// MySQL session store
const sessionStore = new MySQLStore({
  // Database server IP address/hostname
  host: dbSelection.host,
  // Database server listening port
  port: dbSelection.port,
  // Database username
  user: dbSelection.username,
  // Password for the above database user
  password: dbSelection.password,
  // Database name to save sessions table to
  database: dbSelection.database,
  // Whether or not to automatically check for and clear expired sessions:
  clearExpired: true,
  // How frequently expired sessions will be cleared; milliseconds:
  checkExpirationInterval: 900000,
  // Whether or not to create the sessions database table, if one does not already exist
  createDatabaseTable: true,
  // Set Sessions table name
  schema: {
    tableName: sessionTableName,
  },
})

const isValidSession = async (userId) => {
  const ts = Math.floor(new Date().getTime() / 1000)
  const results = await Session.query()
    .select('session_id')
    .whereRaw(`json_extract(data, '$.passport.user.id') = ${userId}`)
    .andWhere('expires', '>=', ts)
  return results.length < maxSessions
}

const clearOtherSessions = async (userId, currentSessionId) => {
  const results = await Session.query()
    .whereRaw(`json_extract(data, '$.passport.user.id') = ${userId}`)
    .andWhere('session_id', '!=', currentSessionId || '')
    .delete()
  console.log('[Session] Clear Result:', results)
}

const clearDiscordSessions = async (discordId, botName) => {
  const results = await Session.query()
    .whereRaw(
      `json_extract(data, '$.passport.user.discordId') = '${discordId}'`,
    )
    .orWhereRaw(`json_extract(data, '$.passport.user.id') = '${discordId}'`)
    .delete()
  console.log(`[Session${botName && ` - ${botName}`}] Clear Result:`, results)
}

module.exports = {
  sessionStore,
  isValidSession,
  clearOtherSessions,
  clearDiscordSessions,
}
