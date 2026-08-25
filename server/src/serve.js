// @ts-check
require('dotenv').config()

const path = require('path')

const { log, TAGS } = require('@rm/logger')
const config = require('@rm/config')

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

const server = Bun.serve({
  hostname: config.getSafe('interface'),
  port: config.has('v2Port') ? config.getSafe('v2Port') : 8081,
  async fetch(request) {
    const url = new URL(request.url)

    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok' })
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
