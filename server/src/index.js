const express = require('express')
const path = require('path')
const logger = require('morgan')
const compression = require('compression')
const session = require('express-session')
const passport = require('passport')
require('./db/initialization')

const { sessionStore } = require('./services/session-store.js')
const rootRouter = require('./routes/rootRouter.js')
const config = require('./services/config.js')

const app = express()

app.use(logger('dev'))

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
if (config.discord.enabled) {
  // eslint-disable-next-line global-require
  require('./strategies/discordStrategy')

  app.use(passport.initialize())

  app.use(passport.session())
}

app.use(rootRouter)

app.listen(config.port, config.interface, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is now listening at http://${config.interface}:${config.port}`)
})

module.exports = app
