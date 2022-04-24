/* eslint-disable no-console */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
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

const { Db } = require('./services/initialization')
const config = require('./services/config')
const { sessionStore } = require('./services/sessionStore')
const rootRouter = require('./routes/rootRouter')
const typeDefs = require('./graphql/typeDefs')
const resolvers = require('./graphql/resolvers')
const { version } = require('../../package.json')

if (!config.devOptions.skipUpdateCheck) {
  require('./services/checkForUpdates')
}

const app = express()

const server = new ApolloServer({
  cors: true,
  typeDefs,
  resolvers,
  introspection: config.devOptions.enabled,
  debug: config.devOptions.queryDebug,
  context: ({ req, res }) => {
    const perms = req.user ? req.user.perms : req.session.perms
    return { req, res, Db, perms, version }
  },
  formatError: (e) => {
    if (config.devOptions.enabled) {
      console.warn(e)
    }
    if (e instanceof ValidationError || e?.message.includes('skipUndefined()')) {
      return { message: 'old_client' }
    }
    if (['old_client', 'session_expired'].includes(e.message)) {
      return { message: e.message }
    }
    console.warn(['GQL'], e.message)
    return { message: e.message }
  },
})

server.start().then(() => server.applyMiddleware({ app, path: '/graphql' }))

if (config.devOptions.enabled) {
  app.use(logger((tokens, req, res) => [
    tokens.method(req, res),
    tokens.url(req, res),
    tokens.status(req, res),
    tokens['response-time'](req, res),
    'ms',
    req.user ? `- ${req.user.username}` : 'Not Logged In',
    '-',
    req.headers['x-forwarded-for'],
  ].join(' ')))
}

const RateLimitTime = config.api.rateLimit.time * 60 * 1000
const MaxRequestsPerHour = config.api.rateLimit.requests * (RateLimitTime / 1000)

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

app.use(session({
  name: 'discord',
  key: 'session',
  secret: config.api.sessionSecret,
  store: sessionStore,
  resave: true,
  saveUninitialized: false,
  cookie: { maxAge: 86400000 * config.api.cookieAgeDays },
}))

config.authentication.strategies.forEach(strategy => {
  if (strategy.enabled) {
    require(`./strategies/${strategy.name}.js`)
    console.log(`[AUTH] Strategy ${strategy.name} initialized`)
  } else {
    console.log(`[AUTH] Strategy ${strategy.name} was not initialized`)
  }
})

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

i18next.use(Backend).init({
  lng: 'en',
  fallbackLng: 'en',
  preload: config.map.localeSelection,
  ns: ['translation'],
  defaultNS: 'translation',
  backend: { loadPath: path.resolve(`${__dirname}/../../public/locales/{{lng}}/{{ns}}.json`) },
}, (err, t) => {
  if (err) return console.error(err)
})

app.use(rootRouter, requestRateLimiter)

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Express Error]:', err.message)
  switch (err.message) {
    case 'NoCodeProvided':
      return res.redirect('/404')
    case 'Failed to fetch user\'s guilds':
      return res.redirect('/login')
    default:
      return res.redirect('/')
  }
})

app.listen(config.port, config.interface, () => {
  console.log(`[INIT] Server is now listening at http://${config.interface}:${config.port}`)
})

module.exports = app
