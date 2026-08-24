const http = require('http')
const { afterAll, beforeAll, expect, test } = require('bun:test')
const express = require('express')
const session = require('express-session')
const passport = require('passport')

const {
  SHELL_FLAG_COLUMN,
  resolveShell,
} = require('../src/routes/clientRouter')
const { refreshSessionUser } = require('../src/utils/refreshSessionUser')

// Requiring the middleware registers the serializer pair this depends on.
require('../src/middleware/passport')

/**
 * Flipping the users table column used to do nothing until the person logged
 * out, because passport serializes the whole row into the session and
 * deserializes it without re-reading the database.
 *
 * The subtlety that makes this worth an end to end test: the deserializer
 * hands back a spread copy, so patching `req.user` alone is discarded when the
 * request ends and the next page load is served from the stale session again.
 * A row that changes has to reach the object stored in the session.
 */

// Stands in for the users table row that /api/settings re-reads.
const row = { id: 1, perms: { map: true }, [SHELL_FLAG_COLUMN]: 0 }

let server
let port = 0
const cookies = []

const request = async (url) => {
  const res = await fetch(`http://127.0.0.1:${port}${url}`, {
    headers: cookies.length ? { cookie: cookies.join('; ') } : {},
  })
  const setCookies = res.headers.getSetCookie?.() || []
  setCookies.forEach((cookie) => cookies.push(cookie.split(';')[0]))
  return res.text()
}

beforeAll(async () => {
  const app = express()
  app.use(session({ secret: 'test', resave: true, saveUninitialized: false }))
  app.use(passport.initialize())
  app.use(passport.session())

  app.get('/login', (req, res) => {
    req.login({ ...row }, () => res.send('ok'))
  })
  // The copy back that /api/settings performs after fetching the row.
  app.get('/settings', (req, res) => {
    refreshSessionUser(req, row)
    res.send('ok')
  })
  // What serving the HTML shell decides, on a request of its own.
  app.get('/shell', (req, res) => res.send(resolveShell(req)))

  server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  port = server.address().port
})

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
})

test('a column flipped after login reaches later requests', async () => {
  await request('/login')
  expect(await request('/shell')).toBe('index.html')

  // An operator sets the column while the session is already open.
  row[SHELL_FLAG_COLUMN] = 1
  expect(await request('/shell')).toBe('index.html')

  // One settings call later, which every page load makes, the flag is live.
  await request('/settings')
  expect(await request('/shell')).toBe('app.html')

  // And setting it back rescues the person without a logout.
  row[SHELL_FLAG_COLUMN] = 0
  await request('/settings')
  expect(await request('/shell')).toBe('index.html')
})

test('the settings endpoint is what performs the copy back', () => {
  // The app above is a stand in, so on its own it would keep passing if the
  // real endpoint stopped refreshing the user. This pins the actual call.
  const source = require('node:fs').readFileSync(
    require.resolve('../src/routes/rootRouter.js'),
    'utf8',
  )
  expect(source).toMatch(/refreshSessionUser\(req,\s*user\)/)
})
