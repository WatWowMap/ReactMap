// @ts-check
const session = require('express-session')
const MySQLStore = require('express-mysql-session')(session)
const config = require('config')

const dbSelection = config
  .getSafe('database.schemas')
  .find(({ useFor }) => useFor?.includes('user'))

const sessionStore =
  dbSelection && 'host' in dbSelection
    ? new MySQLStore({
        clearExpired: true,
        checkExpirationInterval: config.getSafe('api.sessionCheckIntervalMs'),
        createDatabaseTable: true,
        endConnectionOnClose: true,
        schema: {
          tableName: config.getSafe('database.settings.sessionTableName'),
        },
        host: dbSelection.host,
        port: dbSelection.port,
        password: dbSelection.password,
        user: dbSelection.username,
        database: dbSelection.database,
      })
    : null

module.exports = sessionStore
