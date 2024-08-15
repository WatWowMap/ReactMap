// @ts-check
const session = require('express-session')
const mysqlSession = require('express-mysql-session')

const config = require('@rm/config')

function sessionMiddleware() {
  // @ts-ignore
  const MySQLStore = mysqlSession(session)

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

  return session({
    name: 'reactmap1',
    secret: config.getSafe('api.sessionSecret'),
    store: sessionStore,
    resave: true,
    saveUninitialized: false,
    cookie: { maxAge: 86400000 * config.getSafe('api.cookieAgeDays') },
  })
}

module.exports = { sessionMiddleware }
