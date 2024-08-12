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
const { default: helmet } = require('helmet')

const { log, TAGS, Logger } = require('@rm/logger')
const config = require('@rm/config')

const state = require('./services/state')
const { starti18n } = require('./services/i18n')
const { checkForUpdates } = require('./services/checkForUpdates')
const { loadLatestAreas, loadCachedAreas } = require('./services/areas')
const { startWatcher } = require('./services/watcher')

const { rateLimitingMiddleware } = require('./middleware/rateLimiting')
const { initSentry, sentryMiddleware } = require('./middleware/sentry')
const { loggerMiddleware } = require('./middleware/logger')
const { noSourceMapMiddleware } = require('./middleware/noSourceMap')
const { initPassport } = require('./middleware/passport')
const { errorMiddleware } = require('./middleware/error')
const { sessionMiddleware } = require('./middleware/session')
const { apolloMiddleware } = require('./middleware/apollo')

const startApollo = require('./graphql/server')
const { bindConnections } = require('./models')
const { migrate } = require('./db/migrate')
const rootRouter = require('./routes/rootRouter')

const startServer = async () => {
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

  app.use(
    loggerMiddleware,
    noSourceMapMiddleware,
    express.static(distDir),
    sessionMiddleware(),
    compression(),
    express.json({
      limit: '50mb',
      verify: (req, _res, buf) => {
        req.bodySize = (req.bodySize || 0) + buf.length
      },
    }),
  )

  if (config.getSafe('api.enableHelmet')) {
    app.use(
      helmet({
        hidePoweredBy: true,
        contentSecurityPolicy: {
          directives: {
            scriptSrc: [
              "'self'",
              'https://cdn.jsdelivr.net',
              'https://telegram.org',
              'https://static.cloudflareinsights.com',
            ],
            frameSrc: ["'self'", 'https://*.telegram.org'],
            workerSrc: ["'self'", 'blob:'],
          },
        },
      }),
    )
  }

  initPassport(app)

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

startServer()
