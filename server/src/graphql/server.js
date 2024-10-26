/* eslint-disable prefer-destructuring */
// @ts-check
const path = require('path')
const { ApolloServer } = require('@apollo/server')

const { loadTypedefs } = require('@graphql-tools/load')
const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader')
const {
  ApolloServerPluginDrainHttpServer,
} = require('@apollo/server/plugin/drainHttpServer')
const {
  ApolloServerPluginLandingPageDisabled,
} = require('@apollo/server/plugin/disabled')

const config = require('@rm/config')
const { Logger, TAGS, log } = require('@rm/logger')

const { resolvers } = require('./resolvers')
const { state } = require('../services/state')

/** @param {import('http').Server} httpServer */
async function startApollo(httpServer) {
  const documents = await loadTypedefs(
    path.join(__dirname, './typeDefs', '*.graphql'),
    {
      loaders: [new GraphQLFileLoader()],
    },
  )
  const typeDefs = documents.map((d) => d.document.definitions.slice())
  const gqlLogger = new Logger('gql')

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: config.getSafe('devOptions.graphiql'),
    formatError: (e) => {
      let customMessage = ''
      if (
        e?.message.includes('skipUndefined()') ||
        e?.message === 'old_client'
      ) {
        customMessage =
          'old client detected, forcing user to refresh, no need to report this error unless it continues to happen'
      } else if (e.message === 'session_expired') {
        customMessage =
          'user session expired, forcing logout, no need to report this error unless it continues to happen'
      } else if (e.message === 'unauthenticated') {
        customMessage =
          'user is not authenticated, forcing logout, no need to report this error unless it continues to happen'
      } else if (e.message === 'data_limit_reached') {
        customMessage = `user has reached the data limit, blocking future requests for ${Math.ceil(
          (Number(e?.extensions?.until || 0) - Date.now()) / 1000,
        )} seconds`
      }

      const key = `${e.extensions.id || e.extensions.user}-${e.message}`
      if (state.stats.hasApolloEntry(key)) {
        if (e?.extensions?.stacktrace) {
          delete e.extensions.stacktrace
        }
        return e
      }
      if (!config.getSafe('devOptions.enabled')) {
        state.stats.setApolloEntry(key)
      }

      const endpoint = /** @type {string} */ (e.extensions.endpoint)

      gqlLogger.log[customMessage ? 'info' : 'warn'](
        TAGS[endpoint] || `[${endpoint?.toUpperCase()}]`,
        'Client:',
        e.extensions.clientV || 'Unknown',
        '|',
        'Server:',
        e.extensions.serverV || 'Unknown',
        '|',
        'User:',
        e.extensions.user || 'Not Logged In',
        // e.extensions.id || '',
        '|',
        customMessage || e,
      )
      if (e?.extensions?.stacktrace) {
        delete e.extensions.stacktrace
      }
      return e
    },
    logger: {
      debug: (...e) => gqlLogger.log.debug(...e),
      info: (...e) => gqlLogger.log.info(...e),
      warn: (...e) => gqlLogger.log.warn(...e),
      error: (...e) => gqlLogger.log.error(...e),
    },
    plugins: [
      ApolloServerPluginLandingPageDisabled(),
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async requestDidStart(requestContext) {
          requestContext.contextValue.startTime = Date.now()
          if (requestContext.request?.variables?.filters) {
            log.trace(requestContext.request?.variables?.filters)
          }
          return {
            async willSendResponse({
              response,
              contextValue,
              operation,
              operationName,
            }) {
              const filterCount =
                Object.keys(requestContext.request?.variables?.filters || {})
                  .length || 0

              if (
                response.body.kind === 'single' &&
                'data' in response.body.singleResult
              ) {
                const endpoint =
                  // @ts-ignore
                  operation?.selectionSet?.selections?.[0]?.name?.value

                const data = response.body.singleResult.data?.[endpoint]
                const returned = (Array.isArray(data) ? data.length : 0) || 0

                if (contextValue.userId) {
                  state.stats.pushApiEntry(
                    contextValue.userId,
                    endpoint,
                    returned,
                  )
                }

                log.info(
                  TAGS[endpoint] || `[${endpoint?.toUpperCase()}]`,
                  '|',
                  operationName,
                  '|',
                  returned,
                  '|',
                  `${Date.now() - contextValue.startTime}ms`,
                  '|',
                  contextValue.username || 'Not Logged In',
                  '|',
                  'Filters:',
                  filterCount,
                )

                // @ts-ignore
                if (returned && response.__sentry_transaction) {
                  // @ts-ignore
                  response.__sentry_transaction.setMeasurement(
                    `${endpoint}.returned`,
                    returned,
                    'kilobyte',
                  )
                }
              }
            },
          }
        },
      },
    ],
  })

  await apolloServer.start()

  return apolloServer
}

module.exports = { startApollo }
