/* eslint-disable no-console */

const session = require('express-session')
const mysql2 = require('mysql2/promise')
const MySQLStore = require('express-mysql-session')(session)
const {
  api: { maxSessions, sessionCheckIntervalMs },
  database: {
    schemas,
    settings: { sessionTableName },
  },
} = require('./config')
const { Session } = require('../models/index')

const dbSelection = schemas.find(({ useFor }) => useFor?.includes('session'))

const sessionStore = new MySQLStore(
  {
    clearExpired: true,
    checkExpirationInterval: sessionCheckIntervalMs,
    createDatabaseTable: true,
    schema: {
      tableName: sessionTableName,
    },
  },
  mysql2.createPool({
    host: dbSelection.host,
    port: dbSelection.port,
    user: dbSelection.username,
    password: dbSelection.password,
    database: dbSelection.database,
  }),
)

const isValidSession = async (userId) => {
  try {
    const ts = Math.floor(new Date().getTime() / 1000)
    const results = await Session.query()
      .select('session_id')
      .whereRaw(`json_extract(data, '$.passport.user.id') = ${userId}`)
      .andWhere('expires', '>=', ts)
    return results.length < maxSessions
  } catch (e) {
    console.error('[SESSION] Unable to validate session', e)
    return false
  }
}

const clearOtherSessions = async (userId, currentSessionId) => {
  try {
    const results = await Session.query()
      .whereRaw(`json_extract(data, '$.passport.user.id') = ${userId}`)
      .andWhere('session_id', '!=', currentSessionId || '')
      .delete()
    console.log('[Session] Clear Result:', results)
  } catch (e) {
    console.error('[SESSION] Unable to clear other sessions', e)
  }
}

const clearDiscordSessions = async (discordId, botName) => {
  try {
    const results = await Session.query()
      .whereRaw(
        `json_extract(data, '$.passport.user.discordId') = '${discordId}'`,
      )
      .orWhereRaw(`json_extract(data, '$.passport.user.id') = '${discordId}'`)
      .delete()
    console.log(`[Session${botName && ` - ${botName}`}] Clear Result:`, results)
  } catch (e) {
    console.error('[SESSION] Unable to clear Discord sessions', e)
  }
}

module.exports = {
  sessionStore,
  isValidSession,
  clearOtherSessions,
  clearDiscordSessions,
}
