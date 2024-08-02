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

const { log, HELPERS, getTimeStamp } = require('@rm/logger')

require('./models')
const rootRouter = require('./routes/rootRouter')
const startApollo = require('./graphql/server')

const config = require('./services/config')
const { Db, Event } = require('./services/initialization')
const Clients = require('./services/Clients')
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

  startWatcher()

  Event.clients = Clients

  const distDir = path.join(
    __dirname,
    '../../',
    `dist${
      process.env.NODE_CONFIG_ENV ? `-${process.env.NODE_CONFIG_ENV}` : ''
    }`,
  )

  await starti18n(path.resolve(distDir, 'locales'))

  const app = express()

  app.disable('x-powered-by')

  app.use(
    loggerMiddleware,
    noSourceMapMiddleware,
    errorMiddleware,
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

  await Db.getDbContext()

  const serverInterface = config.getSafe('interface')
  const serverPort = config.getSafe('port')
  httpServer.listen(serverPort, serverInterface)
  log.info(
    HELPERS.ReactMap,
    `Server is now listening at http://${serverInterface}:${serverPort}`,
  )

  await Promise.all([
    Db.historicalRarity(),
    Db.getFilterContext(),
    Event.setAvailable('gyms', 'Gym', Db),
    Event.setAvailable('pokestops', 'Pokestop', Db),
    Event.setAvailable('pokemon', 'Pokemon', Db),
    Event.setAvailable('nests', 'Nest', Db),
  ])
  await Promise.all([
    Event.getUniversalAssets(config.getSafe('icons.styles'), 'uicons'),
    Event.getUniversalAssets(config.getSafe('audio.styles'), 'uaudio'),
    Event.getMasterfile(Db.historical, Db.rarity),
    Event.getInvasions(config.getSafe('api.pogoApiEndpoints.invasions')),
    Event.getWebhooks(),
    loadLatestAreas().then((res) => (config.areas = res)),
  ])

  const text = rainbow(`ℹ ${getTimeStamp()} [ReactMap] has fully started`)
  setTimeout(() => text.stop(), 1_000)

  return app
}

startServer()
