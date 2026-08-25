import 'dotenv/config'

import config from '@rm/config'

import { log, TAGS } from '@rm/logger'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import path from 'path'

import { getAuth, isAuthRequest } from './auth'
import { createOnRoleChange, startDiscordBot } from './auth/discord-bot-client'
import {
  resolveIpAddressStrategy,
  resolveTrustProxy,
} from './middleware/trust-proxy'
import { createGolbatClient } from './services/golbat-client'
import { createSettingsHandler } from './settings-response'
import { createContextFactory } from './trpc/context'
import { appRouter } from './trpc/router'
import { createSocketServer } from './ws/socket-server'

// Fire-and-forget: `startDiscordBot` never awaits the gateway login, so a
// missing bot token or an unreachable Discord cannot delay `Bun.serve`
// below or block a local sign-in. Every guild/role lookup this process
// makes while the bot is absent or still connecting is treated as
// `unknown` (see discord-roles.js / discord-perms.js), not as "no perms" --
// an outage never turns into a denial, it just leaves `user_perms`
// un-refreshed until the bot is reachable again.
const discordStrategy = config
  .getSafe('authentication.strategies')
  .find((s: any) => s.type === 'discord' && s.enabled)
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
 */
const resolveStaticPath = (pathname: string): string | null => {
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

// One Golbat client shared by every RPC procedure and every socket's poll
// loop -- Golbat is stateless per-request, so there is nothing connection-
// scoped to gain by creating a fresh one each time. `init()` reads
// `GET /api/status` once at boot (caps, `fort_in_memory`) per the transport
// spec ("Golbat is required ... read at boot for capabilities and caps");
// it is fire-and-forget so an unreachable Golbat at startup cannot block
// this process from serving auth/settings/static at all -- every caller
// below tolerates `capabilities` still being `null` (see golbat-client.js).
const golbatClient = createGolbatClient()
golbatClient.init().catch((err) => {
  log.warn(
    TAGS.ReactMap,
    `Golbat status check failed at boot (will retry lazily on first use): ${err?.message || err}`,
  )
})

const trpcCreateContext = createContextFactory({ golbatClient })
const socketServer = createSocketServer({ golbatClient })

const TRPC_PATH_PREFIX = '/api/trpc'

const server = Bun.serve({
  hostname: config.getSafe('interface'),
  // The Express entry that owned 8080 is gone from this branch, so the 2.0
  // server takes the standard `port`/`PORT` config key outright instead of
  // a separate `v2Port` coexistence knob -- there is nothing left to share
  // the machine with.
  port: config.getSafe('port'),
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

    if (url.pathname === '/api/ws') {
      const upgraded = await socketServer.upgrade(request, bunServer)
      // A successful `server.upgrade()` hands the connection off to Bun's
      // native websocket handling; returning `undefined` here is the
      // documented way to tell `Bun.serve` not to also send an HTTP
      // response on top of it.
      if (upgraded) return undefined
      return new Response('Upgrade required', { status: 426 })
    }

    if (
      url.pathname === TRPC_PATH_PREFIX ||
      url.pathname.startsWith(`${TRPC_PATH_PREFIX}/`)
    ) {
      // Same native mount shape as Better Auth above: `Request` in,
      // `Response` out, nothing adapting a Node-shaped req/res in between.
      return fetchRequestHandler({
        endpoint: TRPC_PATH_PREFIX,
        req: request,
        router: appRouter,
        createContext: trpcCreateContext,
      })
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
  websocket: socketServer.websocket,
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

export { distDir, server }
