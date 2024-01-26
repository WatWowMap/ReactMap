process.title = 'ReactMap'

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const express = require('express')
const logger = require('morgan')
const compression = require('compression')
const session = require('express-session')
const passport = require('passport')
const rateLimit = require('express-rate-limit')
const { rainbow } = require('chalkercli')
const Sentry = require('@sentry/node')
const { expressMiddleware } = require('@apollo/server/express4')
const cors = require('cors')
const { json } = require('body-parser')
const http = require('http')
const { GraphQLError } = require('graphql')
const { ApolloServerErrorCode } = require('@apollo/server/errors')
const { parse } = require('graphql')

const { log, HELPERS } = require('@rm/logger')
const { create, writeAll } = require('@rm/locales')

const config = require('./services/config')
const { Db, Event } = require('./services/initialization')
require('./models')
const Clients = require('./services/Clients')
const sessionStore = require('./services/sessionStore')
const rootRouter = require('./routes/rootRouter')
const pkg = require('../../package.json')
const { loadLatestAreas } = require('./services/areas')
const { connection } = require('./db/knexfile.cjs')
const startApollo = require('./graphql/server')
require('./services/watcher')

Event.clients = Clients

if (!config.has('devOptions.skipUpdateCheck')) {
  require('./services/checkForUpdates')
}

const app = express()
const httpServer = http.createServer(app)

const sentry = config.getSafe('sentry.server')
if (sentry.enabled || process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: sentry.dsn || process.env.SENTRY_DSN,
    debug: sentry.debug || !!process.env.SENTRY_DEBUG,
    environment: process.env.NODE_ENV || 'production',
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // enable Express.js middleware tracing
      new Sentry.Integrations.Express({
        // to trace all requests to the default router
        app,
        // alternatively, you can specify the routes you want to trace:
        // router: someRouter,
      }),
      ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
    ],
    tracesSampleRate:
      +(process.env.SENTRY_TRACES_SAMPLE_RATE || sentry.tracesSampleRate) ||
      0.1,
    release: pkg.version,
  })

  // RequestHandler creates a separate execution context, so that all
  // transactions/spans/breadcrumbs are isolated across requests
  app.use(Sentry.Handlers.requestHandler())
  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler())
}

if (
  config.getSafe('devOptions.logLevel') === 'debug' ||
  config.getSafe('devOptions.logLevel') === 'trace' ||
  config.getSafe('devOptions.enabled')
) {
  app.use(
    logger((tokens, req, res) =>
      [
        HELPERS.info,
        HELPERS.express,
        tokens.method(req, res),
        tokens.url(req, res),
        tokens.status(req, res),
        tokens['response-time'](req, res),
        'ms',
        req.user ? `- ${req.user.username}` : 'Not Logged In',
        '-',
        req.headers['x-forwarded-for'],
      ].join(' '),
    ),
  )
}

app.use((req, res, next) => {
  if (req.url.endsWith('.map')) {
    res.status(403).send('Naughty!')
  } else {
    next()
  }
})

const RateLimitTime = config.getSafe('api.rateLimit.time') * 60 * 1000
const MaxRequestsPerHour =
  config.getSafe('api.rateLimit.requests') * (RateLimitTime / 1000)

const rateLimitOptions = {
  windowMs: RateLimitTime, // Time window in milliseconds
  max: MaxRequestsPerHour, // Start blocking after x requests
  headers: true,
  message: {
    status: 429, // optional, of course
    limiter: true,
    type: 'error',
    message: `Too many requests from this IP, please try again in ${config.getSafe(
      'api.rateLimit.time',
    )} minutes.`,
  },
  /**
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  onLimitReached: (req, res) => {
    log.info(
      HELPERS.express,
      req?.user?.username || 'user',
      'is being rate limited',
    )
    res.redirect('/429')
  },
}
const requestRateLimiter = rateLimit(rateLimitOptions)

app.use(compression())

app.use(express.json({ limit: '50mb' }))

app.use(
  express.static(path.join(__dirname, config.getSafe('devOptions.clientPath'))),
)

app.use(
  session({
    name: 'reactmap1',
    secret: config.getSafe('api.sessionSecret'),
    store: sessionStore,
    resave: true,
    saveUninitialized: false,
    cookie: { maxAge: 86400000 * config.getSafe('api.cookieAgeDays') },
  }),
)

app.use(passport.initialize())

app.use(passport.session())

passport.serializeUser(async (user, done) => {
  done(null, user)
})

passport.deserializeUser(async (user, done) => {
  if (user.perms.map) {
    done(null, user)
  } else {
    done('User does not have map permissions', null)
  }
})

const localePath = path.resolve(__dirname, '../../dist/locales')
if (fs.existsSync(localePath)) {
  require('./services/i18n')
} else {
  create().then((newLocales) =>
    writeAll(newLocales, true, localePath).then(() =>
      require('./services/i18n'),
    ),
  )
}

app.use(rootRouter, requestRateLimiter)

if (sentry.enabled || process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler())
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  log.error(
    HELPERS.express,
    HELPERS.custom(req.originalUrl, '#00d7ac'),
    req.user ? `- ${req.user.username}` : 'Not Logged In',
    '|',
    req.headers['x-forwarded-for'],
    '|',
    err,
  )

  switch (err.message) {
    case 'NoCodeProvided':
      return res.redirect('/404')
    case "Failed to fetch user's guilds":
      return res.redirect('/login')
    default:
      return res.redirect('/')
  }
})

startApollo(httpServer).then((server) => {
  app.use(
    '/graphql',
    cors({ origin: '/' }),
    json(),
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
        let transaction
        if (sentry.enabled || process.env.SENTRY_DSN) {
          transaction = res.__sentry_transaction
          if (!transaction) {
            transaction = Sentry.startTransaction({ name: 'POST /graphql' })
          }
          Sentry.configureScope((scope) => {
            scope.setSpan(transaction)
          })
        }

        const definition = parse(req.body.query).definitions.find(
          (d) => d.kind === 'OperationDefinition',
        )
        const errorCtx = {
          id,
          user,
          clientV,
          serverV,
          endpoint: definition.name?.value || '',
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

        if (!perms) {
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
          definition?.name?.value !== 'SetTutorial'
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
          transaction,
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
    const text = rainbow(
      `ℹ ${new Date()
        .toISOString()
        .split('.')[0]
        .split('T')
        .join(
          ' ',
        )} [ReactMap] Server is now listening at http://${config.getSafe(
        'interface',
      )}:${config.getSafe('port')}`,
    )
    setTimeout(() => text.stop(), 1_000)
  })

module.exports = app
