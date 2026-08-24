// @ts-check
const express = require('express')
const path = require('path')

const clientRouter = express.Router()

/**
 * The users table column that decides which built shell a person is served.
 * Named for what it selects rather than for a version number, since "2.0"
 * stops meaning anything the moment 2.1 exists.
 */
const SHELL_FLAG_COLUMN = 'useAppShell'

const LEGACY_SHELL = 'index.html'
const MODERN_SHELL = 'app.html'

/**
 * Paths the 1.0 client owns. Deep links of the `/@/:lat/:lon/:zoom` and
 * `/id/:category/:id` shapes are in the wild, so nothing here may be dropped.
 */
const LEGACY_ROUTES = [
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

/**
 * Paths the 2.0 client owns, mirroring `app/routes.tsx`. `/`, `/locales` and
 * `/playground` are claimed by both clients; the per-user flag, not the path,
 * is what disambiguates them.
 */
const MODERN_ROUTES = [
  '/',
  '/map',
  '/filters',
  '/alerts',
  '/profile',
  '/locales',
  '/playground',
]

const CLIENT_ROUTES = [...new Set([...LEGACY_ROUTES, ...MODERN_ROUTES])]

/**
 * Paths the 2.0 client has no route for, so it would answer them with its
 * catch-all NotFound. They are derived rather than hand listed, since a third
 * literal list would drift the first time either table above changes.
 */
const LEGACY_ONLY_ROUTES = LEGACY_ROUTES.filter(
  (route) => !MODERN_ROUTES.includes(route),
)

/**
 * Which shell this request should be served.
 *
 * Anything falsy means the 1.0 shell, which covers the anonymous visitor, the
 * user whose row predates the migration, and mysql handing back tinyint 0.
 *
 * @param {{ user?: Record<string, any> }} [req]
 * @returns {string}
 */
function resolveShell(req) {
  return req?.user?.[SHELL_FLAG_COLUMN] ? MODERN_SHELL : LEGACY_SHELL
}

/**
 * Absolute path of a named shell file, honouring the NODE_CONFIG_ENV suffix on
 * the dist directory that a multi instance install relies on.
 *
 * @param {string} shell
 * @returns {string}
 */
function shellPath(shell) {
  const suffix = process.env.NODE_CONFIG_ENV
    ? `-${process.env.NODE_CONFIG_ENV}`
    : ''
  return path.join(__dirname, `../../../dist${suffix}`, shell)
}

/**
 * Absolute path of the shell this request should be served.
 *
 * @param {{ user?: Record<string, any> }} [req]
 * @returns {string}
 */
function resolveShellPath(req) {
  return shellPath(resolveShell(req))
}

// A path only 1.0 implements ignores the flag, because serving 2.0 there would
// hand a flagged user its NotFound page for a link that works for everyone
// else. The two sets are disjoint, so registration order does not matter.
clientRouter.get(LEGACY_ONLY_ROUTES, (_req, res) => {
  res.sendFile(shellPath(LEGACY_SHELL))
})

clientRouter.get(MODERN_ROUTES, (req, res) => {
  res.sendFile(resolveShellPath(req))
})

module.exports = {
  clientRouter,
  CLIENT_ROUTES,
  LEGACY_ROUTES,
  LEGACY_ONLY_ROUTES,
  MODERN_ROUTES,
  LEGACY_SHELL,
  MODERN_SHELL,
  SHELL_FLAG_COLUMN,
  resolveShell,
  resolveShellPath,
  shellPath,
}
