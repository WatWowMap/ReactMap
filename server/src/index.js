process.title = 'ReactMap'

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const express = require('express')
const compression = require('compression')
const { rainbow } = require('chalkercli')
const { expressMiddleware } = require('@apollo/server/express4')
const cors = require('cors')
const { json } = require('body-parser')
const http = require('http')
const { GraphQLError } = require('graphql')
const { ApolloServerErrorCode } = require('@apollo/server/errors')
const { parse } = require('graphql')

const { log, HELPERS, getTimeStamp } = require('@rm/logger')
const { create, writeAll } = require('@rm/locales')

const config = require('./services/config')
const { Db, Event } = require('./services/initialization')
require('./models')
const Clients = require('./services/Clients')
const rootRouter = require('./routes/rootRouter')
const pkg = require('../../package.json')
const { loadLatestAreas } = require('./services/areas')
const { connection } = require('./db/knexfile.cjs')
const startApollo = require('./graphql/server')
const { rateLimitingMiddleware } = require('./middleware/rateLimiting')
const { initSentry, sentryMiddleware } = require('./middleware/sentry')
const { loggerMiddleware } = require('./middleware/logger')
const { noSourceMapMiddleware } = require('./middleware/noSourceMap')
const { initPassport } = require('./middleware/passport')
const { errorMiddleware } = require('./middleware/error')
const { sessionMiddleware } = require('./middleware/session')
require('./services/watcher')

Event.clients = Clients

if (!config.getSafe('devOptions.skipUpdateCheck')) {
  require('./services/checkForUpdates')
}

const distDir = path.join(
  __dirname,
  '../../',
  `dist${process.env.NODE_CONFIG_ENV ? `-${process.env.NODE_CONFIG_ENV}` : ''}`,
)
const localePath = path.resolve(distDir, 'locales')

const app = express()
const httpServer = http.createServer(app)

initSentry(app)
initPassport(app)

app.disable('x-powered-by')

app.use(
  loggerMiddleware,
  noSourceMapMiddleware,
  errorMiddleware,
  compression(),
  express.json({
    limit: '50mb',
    verify: (req, res, buf) => {
      req.bodySize = (req.bodySize || 0) + buf.length
    },
  }),
  express.static(distDir),
  sessionMiddleware(),
)

if (fs.existsSync(localePath)) {
  require('./services/i18n')
} else {
  create().then((newLocales) =>
    writeAll(newLocales, true, localePath).then(() =>
      require('./services/i18n'),
    ),
  )
}

app.use(rootRouter, rateLimitingMiddleware())

startApollo(httpServer).then((server) => {
  app.use(
    '/graphql',
    cors({ origin: '/' }),
    json(),
    sentryMiddleware,
    expressMiddleware(server, {
      context: async ({ req, res }) => {
        const perms = req.user ? req.user.perms : req.session.perms
        const user = req?.user?.username || ''
        const id = req?.user?.id || 0
        const clientV =
          req.headers['apollographql-client-version']?.trim() ||
          pkg.version ||
          1
        const serverV = pkg.version || 1

        const definition = parse(req.body.query).definitions.find(
          (d) => d.kind === 'OperationDefinition',
        )
        const endpoint = definition?.name?.value || ''
        const errorCtx = {
          id,
          user,
          clientV,
          serverV,
          endpoint,
        }

        if (clientV && serverV && clientV !== serverV) {
          throw new GraphQLError('old_client', {
            extensions: {
              ...errorCtx,
              http: { status: 464 },
              code: ApolloServerErrorCode.BAD_USER_INPUT,
            },
          })
        }

        if (!perms && endpoint !== 'Locales') {
          throw new GraphQLError('session_expired', {
            extensions: {
              ...errorCtx,
              http: { status: 511 },
              code: 'EXPIRED',
            },
          })
        }

        if (
          definition?.operation === 'mutation' &&
          !id &&
          endpoint !== 'SetTutorial'
        ) {
          throw new GraphQLError('unauthenticated', {
            extensions: {
              ...errorCtx,
              http: { status: 401 },
              code: 'UNAUTHENTICATED',
            },
          })
        }

        return {
          req,
          res,
          Db,
          Event,
          perms,
          user,
          token: req.headers.token,
          operation: definition?.operation,
        }
      },
    }),
  )
})

connection.migrate
  .latest()
  .then(() => connection.destroy())
  .then(() => Db.getDbContext())
  .then(async () => {
    httpServer.listen(config.getSafe('port'), config.getSafe('interface'))
    log.info(
      HELPERS.ReactMap,
      `Server is now listening at http://${config.getSafe(
        'interface',
      )}:${config.getSafe('port')}`,
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
  })

module.exports = app
