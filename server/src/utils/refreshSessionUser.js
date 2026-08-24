// @ts-check

const { SHELL_FLAG_COLUMN } = require('../routes/clientRouter')

/**
 * Columns re-read from the users table on session init and copied onto the
 * logged in user.
 *
 * Passport serialized the whole user row into the session and deserialized it
 * without touching the database, so a column not refreshed here kept the
 * value it had at login until the person logged out. Better Auth's session
 * middleware rebuilds `req.user` from the database on every request instead
 * (see `createAuthSessionMiddleware`), so there is no stale serialized copy
 * to patch: refreshing `req.user` for the current request is enough, because
 * the next request rebuilds it fresh and calls this again.
 */
const REFRESHED_COLUMNS = ['data', SHELL_FLAG_COLUMN]

/**
 * Copies the refreshed columns from a freshly fetched row onto the logged in
 * user for this request.
 *
 * @param {{ user?: Record<string, any> }} req
 * @param {Record<string, any>} row
 */
function refreshSessionUser(req, row) {
  if (!req.user) return
  REFRESHED_COLUMNS.forEach((column) => {
    if (row?.[column] === undefined) return
    req.user[column] = row[column]
  })
}

module.exports = { refreshSessionUser, REFRESHED_COLUMNS }
