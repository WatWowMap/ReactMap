const session = require('express-session')
const MySQLStore = require('express-mysql-session')(session)
const {
  api: { sessionCheckIntervalMs },
  database: {
    schemas,
    settings: { sessionTableName },
  },
} = require('./config')

const dbSelection = schemas.find(({ useFor }) => useFor?.includes('user'))

const sessionStore = dbSelection
  ? new MySQLStore({
      clearExpired: true,
      checkExpirationInterval: sessionCheckIntervalMs,
      createDatabaseTable: true,
      endConnectionOnClose: true,
      schema: {
        tableName: sessionTableName,
      },
      host: dbSelection.host,
      port: dbSelection.port,
      password: dbSelection.password,
      user: dbSelection.username,
      database: dbSelection.database,
    })
  : null

module.exports = sessionStore
