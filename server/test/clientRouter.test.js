const http = require('http')
const path = require('path')
const { afterEach, expect, test } = require('bun:test')
const express = require('express')

const {
  clientRouter,
  CLIENT_ROUTES,
  LEGACY_ONLY_ROUTES,
  MODERN_ROUTES,
  LEGACY_SHELL,
  MODERN_SHELL,
  SHELL_FLAG_COLUMN,
  resolveShell,
  resolveShellPath,
} = require('../src/routes/clientRouter')

const originalConfigEnv = process.env.NODE_CONFIG_ENV

afterEach(() => {
  if (originalConfigEnv === undefined) {
    delete process.env.NODE_CONFIG_ENV
  } else {
    process.env.NODE_CONFIG_ENV = originalConfigEnv
  }
})

test('an anonymous visitor gets the 1.0 shell', () => {
  expect(resolveShell({})).toBe(LEGACY_SHELL)
  expect(resolveShell({ user: undefined })).toBe(LEGACY_SHELL)
  expect(resolveShell(undefined)).toBe(LEGACY_SHELL)
})

test('a logged in user without the flag gets the 1.0 shell', () => {
  expect(resolveShell({ user: { id: 1 } })).toBe(LEGACY_SHELL)
  expect(resolveShell({ user: { id: 1, [SHELL_FLAG_COLUMN]: false } })).toBe(
    LEGACY_SHELL,
  )
})

test('mysql returns tinyint(1), so 0 must read as off and 1 as on', () => {
  expect(resolveShell({ user: { id: 1, [SHELL_FLAG_COLUMN]: 0 } })).toBe(
    LEGACY_SHELL,
  )
  expect(resolveShell({ user: { id: 1, [SHELL_FLAG_COLUMN]: 1 } })).toBe(
    MODERN_SHELL,
  )
})

test('a user carrying the flag gets the 2.0 shell', () => {
  expect(resolveShell({ user: { id: 1, [SHELL_FLAG_COLUMN]: true } })).toBe(
    MODERN_SHELL,
  )
})

test('the served path keeps the NODE_CONFIG_ENV dist suffix', () => {
  delete process.env.NODE_CONFIG_ENV
  expect(resolveShellPath({})).toBe(
    path.join(__dirname, '../../dist/index.html'),
  )

  process.env.NODE_CONFIG_ENV = 'beta'
  expect(resolveShellPath({})).toBe(
    path.join(__dirname, '../../dist-beta/index.html'),
  )
  expect(resolveShellPath({ user: { [SHELL_FLAG_COLUMN]: true } })).toBe(
    path.join(__dirname, '../../dist-beta/app.html'),
  )
})

test('every 1.0 deep link stays in the route list', () => {
  const legacy = [
    '/',
    '/login',
    '/blocked/:info',
    '/@/:lat/:lon',
    '/@/:lat/:lon/:zoom',
    '/id/:category/:id',
    '/id/:category/:id/:zoom',
    '/304',
    '/404',
    '/500',
    '/reset',
    '/playground',
    '/locales',
    '/data-management',
    '/error',
    '/error/:message',
  ]
  legacy.forEach((route) => expect(CLIENT_ROUTES).toContain(route))
})

test('the 2.0 route table is served too, with no duplicates', () => {
  const modern = [
    '/',
    '/map',
    '/filters',
    '/alerts',
    '/profile',
    '/locales',
    '/playground',
  ]
  modern.forEach((route) => expect(CLIENT_ROUTES).toContain(route))
  expect(CLIENT_ROUTES.length).toBe(new Set(CLIENT_ROUTES).size)
})

/**
 * The tests above only check list membership, which is what let the router
 * serve the 2.0 shell on paths only the 1.0 client implements. These drive the
 * real router over HTTP so the assertion is the shell a request actually gets.
 */

const SAMPLE_PARAMS = {
  info: 'banned',
  lat: '40.7',
  lon: '-74.0',
  zoom: '15',
  category: 'pokemon',
  id: '25',
  message: 'boom',
}

/** @param {string} route */
const concreteUrl = (route) =>
  route.replace(/:(\w+)/g, (_full, name) => SAMPLE_PARAMS[name])

/**
 * Boots the router with `sendFile` replaced by a reply naming the file, so a
 * request reports which shell it was routed to without needing a built dist.
 */
async function withRouter(run) {
  const app = express()
  app.use((req, res, next) => {
    if (req.headers.flagged === 'yes') {
      req.user = { id: 1, [SHELL_FLAG_COLUMN]: 1 }
    }
    res.sendFile = (filePath) => res.status(200).send(path.basename(filePath))
    next()
  })
  app.use(clientRouter)

  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  const { port } = server.address()
  try {
    await run(async (route, flagged) => {
      const res = await fetch(`http://127.0.0.1:${port}${concreteUrl(route)}`, {
        headers: flagged ? { flagged: 'yes' } : {},
      })
      return res.text()
    })
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}

test('a path only 1.0 implements serves the 1.0 shell even when flagged', async () => {
  expect(LEGACY_ONLY_ROUTES.length).toBe(13)
  await withRouter(async (request) => {
    for (const route of LEGACY_ONLY_ROUTES) {
      expect(await request(route, false)).toBe(LEGACY_SHELL)
      expect(await request(route, true)).toBe(LEGACY_SHELL)
    }
  })
})

test('a path both clients implement follows the flag', async () => {
  await withRouter(async (request) => {
    for (const route of MODERN_ROUTES) {
      expect(await request(route, false)).toBe(LEGACY_SHELL)
      expect(await request(route, true)).toBe(MODERN_SHELL)
    }
  })
})
