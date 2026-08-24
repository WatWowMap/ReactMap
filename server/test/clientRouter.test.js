const path = require('path')
const { afterEach, expect, test } = require('bun:test')

const {
  CLIENT_ROUTES,
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
