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

const { log, HELPERS, getTimeStamp } = require('@rm/logger')

const rootRouter = require('./routes/rootRouter')
const startApollo = require('./graphql/server')
const { bindConnections } = require('./models')

const config = require('./services/config')
const state = require('./services/state')
const { starti18n } = require('./services/i18n')
const { checkForUpdates } = require('./services/checkForUpdates')
const { loadLatestAreas } = require('./services/areas')

const { rateLimitingMiddleware } = require('./middleware/rateLimiting')
const { initSentry, sentryMiddleware } = require('./middleware/sentry')
const { loggerMiddleware } = require('./middleware/logger')
const { noSourceMapMiddleware } = require('./middleware/noSourceMap')
const { initPassport } = require('./middleware/passport')
const { errorMiddleware } = require('./middleware/error')
const { sessionMiddleware } = require('./middleware/session')
const { apolloMiddleware } = require('./middleware/apollo')
const { startWatcher } = require('./services/watcher')
const { migrate } = require('./db/migrate')

const startServer = async () => {
  if (!config.getSafe('devOptions.skipUpdateCheck')) {
    await checkForUpdates()
    log.info(HELPERS.update, 'Completed')
  }
  state.setTimers()
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
    errorMiddleware,
    helmet(),
    compression(),
    express.json({
      limit: '50mb',
      verify: (req, _res, buf) => {
        req.bodySize = (req.bodySize || 0) + buf.length
      },
    }),
    express.static(distDir),
    sessionMiddleware(),
    rateLimitingMiddleware(),
  )

  initSentry(app)
  initPassport(app)

  app.use(rootRouter)

  const httpServer = http.createServer(app)
  const server = await startApollo(httpServer)

  app.use(
    '/graphql',
    cors({ origin: '/' }),
    json(),
    sentryMiddleware,
    apolloMiddleware(server),
  )

  await migrate()

  await state.db.getDbContext()

  const serverInterface = config.getSafe('interface')
  const serverPort = config.getSafe('port')
  httpServer.listen(serverPort, serverInterface)
  log.info(
    HELPERS.ReactMap,
    `Server is now listening at http://${serverInterface}:${serverPort}`,
  )

  await Promise.all([
    state.db.historicalRarity(),
    state.db.getFilterContext(),
    state.event.setAvailable('gyms', 'Gym', state.db),
    state.event.setAvailable('pokestops', 'Pokestop', state.db),
    state.event.setAvailable('pokemon', 'Pokemon', state.db),
    state.event.setAvailable('nests', 'Nest', state.db),
  ])
  await Promise.all([
    state.event.getUniversalAssets(config.getSafe('icons.styles'), 'uicons'),
    state.event.getUniversalAssets(config.getSafe('audio.styles'), 'uaudio'),
    state.event.getMasterfile(state.db.historical, state.db.rarity),
    state.event.getInvasions(config.getSafe('api.pogoApiEndpoints.invasions')),
    state.event.getWebhooks(),
    loadLatestAreas().then((res) => (config.areas = res)),
  ])

  const text = rainbow(`ℹ ${getTimeStamp()} [ReactMap] has fully started`)
  setTimeout(() => text.stop(), 1_000)

  return httpServer
}

startServer()
