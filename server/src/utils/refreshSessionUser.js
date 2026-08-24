// @ts-check

const { SHELL_FLAG_COLUMN } = require('../routes/clientRouter')

/**
 * Columns re-read from the users table on session init and copied back onto
 * the logged in user.
 *
 * Passport serializes the whole user row into the session and deserializes it
 * without touching the database, so a column that is not refreshed here keeps
 * the value it had at login until the person logs out. Sessions live in the
 * database and survive a restart, so that is indefinitely.
 */
const REFRESHED_COLUMNS = ['data', SHELL_FLAG_COLUMN]

/**
 * Copies the refreshed columns from a freshly fetched row onto both copies of
 * the logged in user: `req.user`, which serves the rest of this request, and
 * the object stored in the session, which is what every later request is
 * deserialized from.
 *
 * Patching only `req.user` would be lost at the end of the request, since the
 * deserializer hands back a copy rather than the stored object.
 *
 * @param {{ user?: Record<string, any>, session?: Record<string, any> }} req
 * @param {Record<string, any>} row
 */
function refreshSessionUser(req, row) {
  const storedUser = req.session?.passport?.user
  const targets = [req.user, storedUser].filter(Boolean)

  let changedStored = false
  REFRESHED_COLUMNS.forEach((column) => {
    if (row?.[column] === undefined) return
    targets.forEach((target) => {
      target[column] = row[column]
    })
    if (storedUser) changedStored = true
  })

  if (changedStored) {
    req.session.save()
  }
}

module.exports = { refreshSessionUser, REFRESHED_COLUMNS }
