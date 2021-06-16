const express = require('express')
const path = require('path')
const logger = require('morgan')
const compression = require('compression')
const session = require('express-session')
const passport = require('passport')
const rateLimit = require('express-rate-limit')
require('./db/initialization')

const { sessionStore } = require('./services/session-store.js')
const rootRouter = require('./routes/rootRouter.js')
const config = require('./services/config.js')

const app = express()

if (config.devOptions.enabled) {
  app.use(logger('dev'))
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
  cookie: { maxAge: 604800000 },
}))
if (config.enabledAuthMethods.length > 0) {
  if (config.enabledAuthMethods.includes('discord')) {
    // eslint-disable-next-line global-require
    require('./strategies/discordStrategy')
  }
  if (config.enabledAuthMethods.includes('customAuth')) {
    // eslint-disable-next-line global-require
    require('./strategies/localStrategy')
  }

  app.use(passport.initialize())

  app.use(passport.session())
}

app.use(rootRouter, requestRateLimiter)

app.listen(config.port, config.interface, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is now listening at http://${config.interface}:${config.port}`)
})

module.exports = app
