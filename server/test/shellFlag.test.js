const assert = require('node:assert/strict')
const { test } = require('bun:test')

const { SHELL_FLAG_COLUMN } = require('../src/routes/clientRouter')
const { REFRESHED_COLUMNS } = require('../src/utils/refreshSessionUser')

/**
 * The bug this used to guard against: Discord, Telegram, and local login each
 * built the session user by hand (or via a passport strategy that spread the
 * users-table row), so a new column would only reach a session for free if
 * that particular strategy's code happened to carry it along.
 *
 * Better Auth replaced all three login paths, and none of them populate
 * `req.user` from the legacy `users` table at all (see
 * `server/src/middleware/authSession.js`). Every strategy now goes through
 * the same single re-read in `refreshSessionUser`, which the `/api/settings`
 * handler calls on every request (`server/src/routes/rootRouter.js`). A
 * column that should follow the logged in user across strategies belongs in
 * `REFRESHED_COLUMNS`, once, rather than being copied per client.
 */
test('the shell flag is refreshed for every login strategy through one shared column list', () => {
  assert.ok(
    REFRESHED_COLUMNS.includes(SHELL_FLAG_COLUMN),
    `${SHELL_FLAG_COLUMN} must be in REFRESHED_COLUMNS, or a person flagged onto the 2.0 shell would silently stay on 1.0`,
  )
})
