process.title = 'ReactMap'
process.env.FORCE_COLOR = 1

require('dotenv').config()
const path = require('path')
const express = require('express')
const logger = require('morgan')
const compression = require('compression')
const session = require('express-session')
const passport = require('passport')
const rateLimit = require('express-rate-limit')
const i18next = require('i18next')
const Backend = require('i18next-fs-backend')
const { ValidationError } = require('apollo-server-core')
const { ApolloServer } = require('apollo-server-express')
const { rainbow } = require('chalkercli')
const Sentry = require('@sentry/node')

const config = require('./services/config')
const { log, HELPERS } = require('./services/logger')
const { Db, Event } = require('./services/initialization')
const Clients = require('./services/Clients')
const sessionStore = require('./services/sessionStore')
const rootRouter = require('./routes/rootRouter')
const typeDefs = require('./graphql/typeDefs')
const resolvers = require('./graphql/resolvers')
const pkg = require('../../package.json')
const getAreas = require('./services/areas')
const { connection } = require('./db/knexfile.cjs')

Event.clients = Clients

if (!config.devOptions.skipUpdateCheck) {
  require('./services/checkForUpdates')
}

const app = express()

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ||
    'https://c40dad799323428f83aee04391639345@o1096501.ingest.sentry.io/6117162',
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
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
  version: pkg.version,
})

// RequestHandler creates a separate execution context, so that all
// transactions/spans/breadcrumbs are isolated across requests
app.use(Sentry.Handlers.requestHandler())
// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler())

const server = new ApolloServer({
  logger: {
    debug: (e) => log.debug(HELPERS.gql, e),
    info: (e) => log.info(HELPERS.gql, e),
    warn: (e) => log.warn(HELPERS.gql, e),
    error: (e) => log.error(HELPERS.gql, e),
  },
  cors: true,
  cache: 'bounded',
  typeDefs,
  resolvers,
  introspection: config.devOptions.enabled,
  debug: config.devOptions.queryDebug,
  context: ({ req, res }) => {
    const perms = req.user ? req.user.perms : req.session.perms
    let transaction = res.__sentry_transaction
    if (!transaction) {
      transaction = Sentry.startTransaction({ name: 'POST /graphql' })
    }
    Sentry.configureScope((scope) => {
      scope.setSpan(transaction)
    })

    return {
      req,
      res,
      Db,
      Event,
      perms,
      serverV: pkg.version || 1,
      clientV:
        req.headers['apollographql-client-version']?.trim() || pkg.version || 1,
      transaction,
    }
  },
  formatError: (e) => {
    if (
      e instanceof ValidationError ||
      e?.message.includes('skipUndefined()') ||
      e?.message === 'old_client'
    ) {
      log.info(
        HELPERS.gql,
        'Old client detected, forcing user to refresh, no need to report this error unless it continues to happen\nClient:',
        e.extensions.clientV,
        'Server:',
        e.extensions.serverV,
        'User:',
        e.extensions.req.user?.username || 'Not Logged In',
      )
      return { message: 'old_client' }
    }
    if (e.message === 'session_expired') {
      log.debug(
        HELPERS.gql,
        'user session expired, forcing logout, no need to report this error unless it continues to happen',
      )
      return { message: 'session_expired' }
    }
    log.error(HELPERS.gql, e)
    if (config.devOptions.enabled) {
      return e
    }
    return { message: e.message }
  },
  formatResponse: (data, context) => {
    const endpoint =
      context?.operation?.selectionSet?.selections?.[0]?.name?.value
    const returned = data?.data?.[endpoint]?.length || 0
    log.info(
      HELPERS.gql,
      'Endpoint:',
      endpoint,
      'Returned:',
      returned || 0,
      'User:',
      context.context.req?.user?.username || 'Not Logged In',
    )

    const { transaction } = context.context

    if (returned) {
      transaction.setMeasurement(`${endpoint}.returned`, returned)
    }

    return data
  },
})

server.start().then(() => server.applyMiddleware({ app, path: '/graphql' }))

if (process.env.LOG_LEVEL === 'debug' || process.env.LOG_LEVEL === 'trace') {
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

const RateLimitTime = config.api.rateLimit.time * 60 * 1000
const MaxRequestsPerHour =
  config.api.rateLimit.requests * (RateLimitTime / 1000)

const rateLimitOptions = {
  windowMs: RateLimitTime, // Time window in milliseconds
  max: MaxRequestsPerHour, // Start blocking after x requests
  headers: true,
  message: {
    status: 429, // optional, of course
    limiter: true,
    type: 'error',
    message: `Too many requests from this IP, please try again in ${config.api.rateLimit.time} minutes.`,
  },
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

app.use(express.static(path.join(__dirname, config.devOptions.clientPath)))

app.use(
  session({
    name: 'reactmap0',
    key: 'session',
    secret: config.api.sessionSecret,
    store: sessionStore,
    resave: true,
    saveUninitialized: false,
    cookie: { maxAge: 86400000 * config.api.cookieAgeDays },
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
    done(null, false)
  }
})

i18next.use(Backend).init(
  {
    lng: 'en',
    fallbackLng: 'en',
    preload: config.map.localeSelection,
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      loadPath: path.resolve(
        `${__dirname}/../../public/locales/{{lng}}/{{ns}}.json`,
      ),
    },
  },
  (err) => {
    if (err) return log.error(HELPERS.i18n, err)
  },
)

app.use(rootRouter, requestRateLimiter)

app.use(Sentry.Handlers.errorHandler())

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  log.error(HELPERS.express, err)
  switch (err.message) {
    case 'NoCodeProvided':
      return res.redirect('/404')
    case "Failed to fetch user's guilds":
      return res.redirect('/login')
    default:
      return res.redirect('/')
  }
})

connection.migrate.latest().then(async () => {
  await Db.determineType()
  await Promise.all([
    Db.historicalRarity(),
    Event.setAvailable('gyms', 'Gym', Db),
    Event.setAvailable('pokestops', 'Pokestop', Db),
    Event.setAvailable('pokemon', 'Pokemon', Db),
    Event.setAvailable('nests', 'Nest', Db),
  ]).then(async () => {
    await Promise.all([
      Event.getUicons(config.icons.styles),
      Event.getMasterfile(Db.historical, Db.rarity),
      Event.getInvasions(config.api.pogoApiEndpoints.invasions),
      Event.getWebhooks(config),
      (config.areas = await getAreas()),
    ]).then(() => {
      app.listen(config.port, config.interface, () => {
        rainbow(
          `Server is now listening at http://${config.interface}:${config.port}`,
        )
      })
    })
  })
})

module.exports = app
