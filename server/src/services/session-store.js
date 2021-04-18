/* eslint-disable no-console */

const session = require('express-session')
const MySQLStore = require('express-mysql-session')(session)
const { raw } = require('objection')
const config = require('./config')

const { database: { schemas } } = config

const dbSelection = Object.keys(schemas).find(name => schemas[name].useFor.includes('session')) || 'scanner'
const { Session } = require('../models/index')

// MySQL session store
const sessionStore = new MySQLStore({
  // Database server IP address/hostname
  host: schemas[dbSelection].host,
  // Database server listening port
  port: schemas[dbSelection].port,
  // Database username
  user: schemas[dbSelection].username,
  // Password for the above database user
  password: schemas[dbSelection].password,
  // Database name to save sessions table to
  database: schemas[dbSelection].database,
  // Whether or not to automatically check for and clear expired sessions:
  clearExpired: true,
  // How frequently expired sessions will be cleared; milliseconds:
  checkExpirationInterval: 900000,
  // Whether or not to create the sessions database table, if one does not already exist
  createDatabaseTable: true,
  // Set Sessions table name
  schema: {
    tableName: config.database.settings.sessionTableName,
  },
})

const isValidSession = async (userId) => {
  const ts = Math.floor((new Date()).getTime() / 1000)
  const results = await Session.query()
    .select('session_id')
    .where(raw(`json_extract(data, '$.passport.user.id') = '${userId}'`))
    .andWhere('expires', '>=', ts)
  return results.length < config.maxSessions
}

const clearOtherSessions = async (userId, currentSessionId) => {
  const results = await Session.query()
    .where(raw(`json_extract(data, '$.passport.user.id') = '${userId}'`))
    .andWhere('session_id', '!=', currentSessionId)
    .delete()
  console.log('[Session] Clear Result:', results)
}

module.exports = {
  sessionStore,
  isValidSession,
  clearOtherSessions,
}
