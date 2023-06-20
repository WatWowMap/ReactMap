const session = require('express-session')
const mysql2 = require('mysql2/promise')
const MySQLStore = require('express-mysql-session')(session)
const {
  api: { sessionCheckIntervalMs },
  database: {
    schemas,
    settings: { sessionTableName },
  },
} = require('./config')
const { log, HELPERS } = require('./logger')

const dbSelection = schemas.find(({ useFor }) => useFor?.includes('session'))

const sessionStore = dbSelection
  ? new MySQLStore(
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
      (err) => err && log.error(HELPERS.custom('sessions'), err),
    )
  : null

module.exports = sessionStore
