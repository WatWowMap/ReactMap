// @ts-check
require('dotenv').config()

process.title = process.env.NODE_CONFIG_ENV
  ? `ReactMap-${process.env.NODE_CONFIG_ENV}`
  : 'ReactMap'

const path = require('path')
const express = require('express')
const compression = require('compression')
const { rainbow } = require('chalkercli')
const cors = require('cors')
const { json } = require('body-parser')
const http = require('http')
const { toNodeHandler } = require('better-auth/node')

const { log, TAGS, Logger } = require('@rm/logger')
const config = require('@rm/config')

const { shutdown, state } = require('./services/state')
const { starti18n } = require('./services/i18n')
const { checkForUpdates } = require('./services/checkForUpdates')
const { loadLatestAreas, loadCachedAreas } = require('./services/areas')
const { startWatcher } = require('./services/watcher')

const { rateLimitingMiddleware } = require('./middleware/rateLimiting')
const { initSentry, sentryMiddleware } = require('./middleware/sentry')
const { loggerMiddleware } = require('./middleware/logger')
const { noSourceMapMiddleware } = require('./middleware/noSourceMap')
const { createAuthSessionMiddleware } = require('./middleware/authSession')
const {
  resolveTrustProxy,
  resolveIpAddressStrategy,
} = require('./middleware/trustProxy')
const { errorMiddleware } = require('./middleware/error')
const { apolloMiddleware } = require('./middleware/apollo')
const { helmetMiddleware } = require('./middleware/helmet')

const { startApollo } = require('./graphql/server')
const { bindConnections } = require('./models')
const { migrate } = require('./db/migrate')
const { rootRouter } = require('./routes/rootRouter')
const { getAuth, buildAuthRoutePrefix } = require('./auth')
const {
  createUsernameAvailabilityGate,
} = require('./auth/usernameAvailability')

const startServer = async () => {
  await state.event.initialize()

  if (!config.getSafe('devOptions.skipUpdateCheck')) {
    await checkForUpdates()
    log.info(TAGS.update, 'Completed')
  }
  config.setAreas(loadCachedAreas())

  state.startTimers()
  state.setAuthClients()

  bindConnections(state.db)
  startWatcher()

  const distDir = path.join(
    __dirname,
    '../../',
    `dist${
      process.env.NODE_CONFIG_ENV ? `-${process.env.NODE_CONFIG_ENV}` : ''
    }`,
  )

  await starti18n(path.resolve(distDir, 'locales'))

  const app = express()

  const trustProxyValue = resolveTrustProxy(config.getSafe('api.trustProxy'))
  app.set('trust proxy', trustProxyValue)

  // Better Auth resolves ip_address purely from headers (see
  // buildAuthOptions in server/src/auth/index.js) and never reads the raw
  // socket. Whenever that resolution falls back to consulting no forwarded
  // header at all (`resolveIpAddressStrategy`'s 'socket' mode: the shipped
  // default `false`, a hop count, or a named Express preset), the socket's
  // own address is written into the same header name instead, so
  // `auth_session.ip_address` records something rather than an empty string
  // for a direct connection. This overwrites rather than appends, which is
  // what keeps it safe: whatever a client sent is discarded outright and
  // replaced with a value only the TCP connection itself could produce.
  if (resolveIpAddressStrategy(trustProxyValue).mode === 'socket') {
    app.use(buildAuthRoutePrefix(), (req, _res, next) => {
      req.headers['x-forwarded-for'] = req.socket.remoteAddress || ''
      next()
    })
  }

  app.use(loggerMiddleware, noSourceMapMiddleware)

  if (config.getSafe('api.enableHelmet')) {
    app.use(helmetMiddleware())
  }

  // Blocks POST is-username-available outright unless local sign-up is on --
  // see server/src/auth/usernameAvailability.js. Has to run ahead of the
  // handler mount below so it can 404 before Better Auth ever answers.
  app.use(
    createUsernameAvailabilityGate(config.getSafe('authentication.strategies')),
  )

  // Better auth reads the raw body itself, so it must sit ahead of the json
  // body parser below, which would otherwise consume the stream first. It
  // still needs to come after helmet and the logger above, so the endpoints
  // that issue session cookies get security headers and an access log entry
  // like every other route.
  app.all(`${buildAuthRoutePrefix()}/*splat`, toNodeHandler(getAuth()))

  // Static and compression come AFTER the auth handler, not before it.
  // `compression` wraps res.write and res.end, and `toNodeHandler` bridges a Web
  // Response into the Node stream in a way it never sees the flush for, so an
  // auth request upstream of compression returns its status and then holds the
  // connection open until the client gives up. Measured: /api/auth/ok answered
  // 200 and hung for the full client timeout, every time.
  app.use(
    // `index: false` keeps serve-static from answering a bare `/` with the 1.0
    // shell off disk, which would shadow the router that picks a shell per user.
    express.static(distDir, { dotfiles: 'allow', index: false }),
    compression(),
  )

  app.use(
    express.json({
      limit: '50mb',
      verify: (req, _res, buf) => {
        req.bodySize = (req.bodySize || 0) + buf.length
      },
    }),
  )

  app.use(createAuthSessionMiddleware())

  const sentryErrorMiddleware = initSentry(app)

  app.use(rootRouter)

  const httpServer = http.createServer(app)
  const server = await startApollo(httpServer)

  app.use(
    '/graphql',
    cors({ origin: '/' }),
    json(),
    sentryMiddleware,
    apolloMiddleware(server),
    rateLimitingMiddleware(),
  )

  if (sentryErrorMiddleware) {
    app.use(sentryErrorMiddleware)
  }
  app.use(errorMiddleware)

  await migrate()

  await state.db.getDbContext()

  const serverInterface = config.getSafe('interface')
  const serverPort = config.getSafe('port')
  httpServer.listen(serverPort, serverInterface)
  log.info(
    TAGS.ReactMap,
    `Server is now listening at http://${serverInterface}:${serverPort}`,
  )

  await state.loadLocalContexts()
  await state.loadExternalContexts()
  const newAreas = await loadLatestAreas()
  config.setAreas(newAreas)

  const text = rainbow(
    `ℹ ${Logger.getTimestamp()} [ReactMap] has fully started`,
  )
  setTimeout(() => text.stop(), 1_000)

  return httpServer
}

startServer().catch((e) => {
  log.error(TAGS.ReactMap, 'Unable to start ReactMap', e)
  shutdown('SIGBREAK', 1)
})
