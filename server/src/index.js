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
const { errorMiddleware } = require('./middleware/error')
const { apolloMiddleware } = require('./middleware/apollo')
const { helmetMiddleware } = require('./middleware/helmet')

const { startApollo } = require('./graphql/server')
const { bindConnections } = require('./models')
const { migrate } = require('./db/migrate')
const { rootRouter } = require('./routes/rootRouter')
const { getAuth, buildAuthRoutePrefix } = require('./auth')

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

  // Better auth reads the raw body itself, so it must sit ahead of the json
  // body parser below (bundled into the next `app.use`), which would
  // otherwise consume the stream first.
  app.all(`${buildAuthRoutePrefix()}/*splat`, toNodeHandler(getAuth()))

  app.use(
    loggerMiddleware,
    noSourceMapMiddleware,
    // `index: false` keeps serve-static from answering a bare `/` with the 1.0
    // shell off disk, which would shadow the router that picks a shell per user.
    express.static(distDir, { dotfiles: 'allow', index: false }),
    compression(),
    express.json({
      limit: '50mb',
      verify: (req, _res, buf) => {
        req.bodySize = (req.bodySize || 0) + buf.length
      },
    }),
  )

  if (config.getSafe('api.enableHelmet')) {
    app.use(helmetMiddleware())
  }

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
