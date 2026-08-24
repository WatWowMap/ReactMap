const { expect, test } = require('bun:test')

const {
  SHELL_FLAG_COLUMN,
  resolveShell,
} = require('../src/routes/clientRouter')
const { refreshSessionUser } = require('../src/utils/refreshSessionUser')

/**
 * Flipping the users table column used to do nothing until the person logged
 * out, because passport serialized the whole row into the session and
 * deserialized it without re-reading the database.
 *
 * Better Auth's session middleware rebuilds `req.user` from the database on
 * every request (`createAuthSessionMiddleware`), so there is no stale
 * serialized copy for a changed column to get stuck in: the very next
 * `/api/settings` call, which every page load makes, sees the new value.
 */

// Stands in for the users table row that /api/settings re-reads.
const row = { id: 1, perms: { map: true }, [SHELL_FLAG_COLUMN]: 0 }

test('a column flipped after login reaches later requests', () => {
  // Stands in for what authSessionMiddleware builds from a better auth
  // session, fresh, on every request.
  const req = { user: { id: 1, perms: { map: true } } }

  expect(resolveShell(req)).toBe('index.html')

  // An operator sets the column while the session is already open.
  row[SHELL_FLAG_COLUMN] = 1
  expect(resolveShell(req)).toBe('index.html')

  // One settings call later, which every page load makes, the flag is live.
  refreshSessionUser(req, row)
  expect(resolveShell(req)).toBe('app.html')

  // And setting it back rescues the person without a logout.
  row[SHELL_FLAG_COLUMN] = 0
  refreshSessionUser(req, row)
  expect(resolveShell(req)).toBe('index.html')
})

test('the settings endpoint is what performs the copy back', () => {
  // req.user above is a stand in, so on its own it would keep passing if the
  // real endpoint stopped refreshing the user. This pins the actual call.
  const source = require('node:fs').readFileSync(
    require.resolve('../src/routes/rootRouter.js'),
    'utf8',
  )
  expect(source).toMatch(/refreshSessionUser\(req,\s*user\)/)
})
