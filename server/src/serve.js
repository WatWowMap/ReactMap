// @ts-check
require('dotenv').config()

const path = require('path')

const { log, TAGS } = require('@rm/logger')
const config = require('@rm/config')

const { getAuth, isAuthRequest } = require('./auth')
const { createSettingsHandler } = require('./settings-response')
const {
  startDiscordBot,
  createOnRoleChange,
} = require('./auth/discord-bot-client')
const {
  resolveTrustProxy,
  resolveIpAddressStrategy,
} = require('./middleware/trust-proxy')

// Fire-and-forget: `startDiscordBot` never awaits the gateway login, so a
// missing bot token or an unreachable Discord cannot delay `Bun.serve`
// below or block a local sign-in. Every guild/role lookup this process
// makes while the bot is absent or still connecting is treated as
// `unknown` (see discord-roles.js / discord-perms.js), not as "no perms" --
// an outage never turns into a denial, it just leaves `user_perms`
// un-refreshed until the bot is reachable again.
const discordStrategy = config
  .getSafe('authentication.strategies')
  .find((s) => s.type === 'discord' && s.enabled)
if (discordStrategy) {
  startDiscordBot({
    botToken: discordStrategy.botToken,
    onRoleChange: createOnRoleChange(),
  })
}

// There is no Express here to hold a `trust proxy` setting, so this reads
// the same `api.trustProxy` config key `getAuth()` already feeds into
// `advanced.ipAddress` and decides, once, whether a forwarded header is
// trustworthy for this process. Mirrors buildAuthOptions' own computation
// (see server/src/auth/index.js) so both agree on the same input.
//
// When the strategy falls back to 'socket' -- the default `false`, a hop
// count, or a named preset -- no forwarded header is safe to trust, and
// Bun's `server.requestIP(request)` is the one source of a real, unspoofable
// address for a direct TCP connection. The header is overwritten (never
// appended) with that value immediately before the auth handler runs, so
// `auth_session.ip_address` records something real rather than either an
// empty string or an attacker-supplied one.
const ipStrategy = resolveIpAddressStrategy(
  resolveTrustProxy(config.getSafe('api.trustProxy')),
)

const distDir = path.join(
  __dirname,
  '../../',
  `dist${process.env.NODE_CONFIG_ENV ? `-${process.env.NODE_CONFIG_ENV}` : ''}`,
)

const appHtmlPath = path.join(distDir, 'app.html')

/**
 * Resolves a request path against `distDir` and refuses anything that would
 * escape it, so a traversal attempt like `/../../etc/passwd` cannot read
 * outside the static bundle.
 *
 * @param {string} pathname
 * @returns {string | null}
 */
const resolveStaticPath = (pathname) => {
  const decoded = decodeURIComponent(pathname)
  const resolved = path.join(distDir, decoded)
  const relative = path.relative(distDir, resolved)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null
  }
  return resolved
}

const notFound = () => new Response('Not Found', { status: 404 })

const settingsHandler = createSettingsHandler()

const server = Bun.serve({
  hostname: config.getSafe('interface'),
  port: config.has('v2Port') ? config.getSafe('v2Port') : 8081,
  async fetch(request, bunServer) {
    const url = new URL(request.url)

    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok' })
    }

    if (isAuthRequest(url.pathname)) {
      if (ipStrategy.mode === 'socket') {
        const socketAddress = bunServer.requestIP(request)
        const headers = new Headers(request.headers)
        headers.set('x-forwarded-for', socketAddress?.address || '')
        request = new Request(request, { headers })
      }
      // Native mount: Better Auth reads the Request and returns a Response
      // directly. No toNodeHandler, no middleware ahead of it -- there is
      // nothing here that wraps a write, buffers a body, or can be mounted
      // in the wrong order.
      return getAuth().handler(request)
    }

    if (url.pathname === '/api/settings') {
      return settingsHandler(request)
    }

    if (url.pathname.startsWith('/api/')) {
      return notFound()
    }

    if (url.pathname === '/') {
      return new Response(Bun.file(appHtmlPath))
    }

    const staticPath = resolveStaticPath(url.pathname)
    if (!staticPath) {
      return notFound()
    }

    const file = Bun.file(staticPath)
    if (await file.exists()) {
      return new Response(file)
    }

    return notFound()
  },
})

log.info(
  TAGS.ReactMap,
  `2.0 server is now listening at http://${server.hostname}:${server.port}`,
)

process.on('SIGINT', () => {
  server.stop()
  process.exit(0)
})

process.on('SIGTERM', () => {
  server.stop()
  process.exit(0)
})

module.exports = { server, distDir }
