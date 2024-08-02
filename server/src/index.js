/* eslint-disable prefer-rest-params */
process.title = 'ReactMap'

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const express = require('express')
const compression = require('compression')
const session = require('express-session')
const passport = require('passport')
const { rainbow } = require('chalkercli')
const { expressMiddleware } = require('@apollo/server/express4')
const cors = require('cors')
const { json } = require('body-parser')
const http = require('http')
const { GraphQLError } = require('graphql')
const { ApolloServerErrorCode } = require('@apollo/server/errors')
const { parse } = require('graphql')
const bytes = require('bytes')

const { log, HELPERS, getTimeStamp } = require('@rm/logger')
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
const { rateLimitingMiddleware } = require('./middleware/rateLimiting')
const { sentryMiddleware, sentryTransaction } = require('./middleware/sentry')
require('./services/watcher')

Event.clients = Clients

if (!config.getSafe('devOptions.skipUpdateCheck')) {
  require('./services/checkForUpdates')
}

const app = express()
const httpServer = http.createServer(app)

sentryMiddleware(app)

app.disable('x-powered-by')

app.use((req, res, next) => {
  if (req.url.endsWith('.map')) {
    res.status(403).send('Naughty!')
  } else {
    next()
  }
})

app.use(compression())

app.use(
  express.json({
    limit: '50mb',
    verify: (req, res, buf) => {
      req.bodySize = (req.bodySize || 0) + buf.length
    },
  }),
)

const distDir = path.join(
  __dirname,
  '../../',
  `dist${process.env.NODE_CONFIG_ENV ? `-${process.env.NODE_CONFIG_ENV}` : ''}`,
)

app.use(express.static(distDir))

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

const localePath = path.resolve(distDir, 'locales')
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

app.use((req, res, next) => {
  const start = process.hrtime()

  const oldWrite = res.write
  const oldEnd = res.end
  let resBodySize = 0

  res.write = function write(chunk) {
    resBodySize += chunk.length
    oldWrite.apply(res, arguments)
  }

  res.end = function end(chunk) {
    if (chunk) {
      resBodySize += chunk.length
    }
    oldEnd.apply(res, arguments)
  }

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start)
    const responseTime = (seconds * 1000 + nanoseconds / 1e6).toFixed(3) // in milliseconds
    log.info(
      HELPERS.express,
      req.method,
      req.originalUrl,
      HELPERS.statusCode(res.statusCode),
      `${responseTime}ms`,
      '|',
      HELPERS.download(bytes(req.bodySize)),
      HELPERS.upload(bytes(resBodySize)),
      '|',
      req.user ? req.user.username : 'Not Logged In',
      req.headers['x-forwarded-for']
        ? `| ${req.headers['x-forwarded-for']}`
        : '',
    )
  })

  next()
})

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
        const transaction = sentryTransaction(res)

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
