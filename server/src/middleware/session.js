// @ts-check
const session = require('express-session')
const mysqlSession = require('express-mysql-session')

const config = require('@rm/config')

/** @type {new (options: object) => any} */
const MySQLStore = mysqlSession(session)

/**
 * The stored row is the authority for its session ID, so revoking only has to delete it.
 * A newly generated session is inserted once and every other write is an update,
 * which keeps a request that still holds a deleted session from recreating it.
 */
class SessionStore extends MySQLStore {
  /** Latest write of each session that was loaded from or inserted into the store */
  #writes = new WeakMap()

  createSession(req, data) {
    const loaded = super.createSession(req, data)
    this.#writes.set(loaded, Promise.resolve())
    return loaded
  }

  set(sid, sess, callback) {
    const previous = this.#writes.get(sess)
    const { tableName, columnNames } = this.options.schema
    const write = previous
      ? previous
          // a failed write was already reported to its caller, later saves still go ahead as updates
          .catch(() => {})
          .then(() =>
            this.query('UPDATE ?? SET ?? = ?, ?? = ? WHERE ?? = ?', [
              tableName,
              columnNames.expires,
              Math.round(
                new Date(
                  sess.cookie.expires || Date.now() + this.options.expiration,
                ).getTime() / 1000,
              ),
              columnNames.data,
              JSON.stringify(sess),
              columnNames.session_id,
              sid,
            ]),
          )
      : super.set(sid, sess)
    this.#writes.set(sess, write)
    if (callback) write.then(() => callback(), callback)
    return write
  }
}

function sessionMiddleware() {
  const dbSelection = config
    .getSafe('database.schemas')
    .find(({ useFor }) => useFor?.includes('user'))

  const sessionStore =
    dbSelection && 'host' in dbSelection
      ? new SessionStore({
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
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 86400000 * config.getSafe('api.cookieAgeDays') },
  })
}

module.exports = { sessionMiddleware }
