/* eslint-disable no-console */
process.title = 'ReactMap'

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

const config = require('./services/config')
const { Db, Event } = require('./services/initialization')
const Clients = require('./services/Clients')
const sessionStore = require('./services/sessionStore')
const rootRouter = require('./routes/rootRouter')
const typeDefs = require('./graphql/typeDefs')
const resolvers = require('./graphql/resolvers')
const pkg = require('../../package.json')
const getAreas = require('./services/areas')

Event.clients = Clients

if (!config.devOptions.skipUpdateCheck) {
  require('./services/checkForUpdates')
}

const app = express()

const server = new ApolloServer({
  cors: true,
  cache: 'bounded',
  typeDefs,
  resolvers,
  introspection: config.devOptions.enabled,
  debug: config.devOptions.queryDebug,
  context: ({ req, res }) => {
    const perms = req.user ? req.user.perms : req.session.perms
    return {
      req,
      res,
      Db,
      Event,
      perms,
      serverV: pkg.version || 1,
      clientV:
        req.headers['apollographql-client-version']?.trim() || pkg.version || 1,
    }
  },
  formatError: (e) => {
    if (config.devOptions.enabled) {
      console.warn(['GQL'], e)
      return e
    }
    if (
      e instanceof ValidationError ||
      e?.message.includes('skipUndefined()') ||
      e?.message === 'old_client'
    ) {
      console.log(
        '[GQL] Old client detected, forcing user to refresh, no need to report this error unless it continues to happen\nClient:',
        e.extensions.clientV,
        'Server:',
        e.extensions.serverV,
      )
      return { message: 'old_client' }
    }
    if (e.message === 'session_expired') {
      if (config.devOptions.enabled) {
        console.log(
          '[GQL] user session expired, forcing logout, no need to report this error unless it continues to happen',
        )
      }
      return { message: 'session_expired' }
    }
    return { message: e.message }
  },
  formatResponse: (data, context) => {
    if (config.devOptions.enabled) {
      const endpoint =
        context?.operation?.selectionSet?.selections?.[0]?.name?.value
      const returned = data?.data?.[endpoint]?.length
      console.log(
        '[GQL]',
        'Endpoint:',
        endpoint,
        returned ? 'Returned:' : '',
        returned || '',
      )
    }
    return null
  },
})

server.start().then(() => server.applyMiddleware({ app, path: '/graphql' }))

if (config.devOptions.enabled) {
  app.use(
    logger((tokens, req, res) =>
      [
        '[EXPRESS]',
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
  /* eslint-disable no-unused-vars */
  onLimitReached: (req, res, options) => {
    // eslint-disable-next-line no-console
    console.warn('user is being rate limited')
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
  (err, t) => {
    if (err) return console.error(err)
  },
)

app.use(rootRouter, requestRateLimiter)

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[EXPRESS]:', err)
  switch (err.message) {
    case 'NoCodeProvided':
      return res.redirect('/404')
    case "Failed to fetch user's guilds":
      return res.redirect('/login')
    default:
      return res.redirect('/')
  }
})

Db.determineType().then(async () => {
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
        console.log(
          `[INIT] Server is now listening at http://${config.interface}:${config.port}`,
        )
      })
    })
  })
})

module.exports = app
