/* eslint-disable prefer-destructuring */
// @ts-check
const path = require('path')
const { ApolloServer } = require('@apollo/server')

const NodeCache = require('node-cache')
const { loadTypedefs } = require('@graphql-tools/load')
const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader')
const {
  ApolloServerPluginDrainHttpServer,
} = require('@apollo/server/plugin/drainHttpServer')
const {
  ApolloServerPluginLandingPageDisabled,
} = require('@apollo/server/plugin/disabled')

const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')

const resolvers = require('./resolvers')
const state = require('../services/state')

/** @param {import('http').Server} httpServer */
async function startApollo(httpServer) {
  const errorCache = new NodeCache({ stdTTL: 60 * 60 })

  const documents = await loadTypedefs(
    path.join(__dirname, './typeDefs', '*.graphql'),
    {
      loaders: [new GraphQLFileLoader()],
    },
  )
  const typeDefs = documents.map((d) => d.document.definitions.slice())

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
      if (errorCache.has(key)) {
        if (e?.extensions?.stacktrace) {
          delete e.extensions.stacktrace
        }
        return e
      }
      if (!config.getSafe('devOptions.enabled')) {
        errorCache.set(key, true)
      }

      const endpoint = /** @type {string} */ (e.extensions.endpoint)

      log[customMessage ? 'info' : 'error'](
        TAGS.gql,
        TAGS[endpoint] || `[${endpoint?.toUpperCase()}]`,
        'Client:',
        e.extensions.clientV || 'Unknown',
        'Server:',
        e.extensions.serverV || 'Unknown',
        'User:',
        e.extensions.user || 'Not Logged In',
        // e.extensions.id || '',
        customMessage || e,
      )
      if (e?.extensions?.stacktrace) {
        delete e.extensions.stacktrace
      }
      return e
    },
    logger: {
      debug: (...e) => log.debug(TAGS.gql, ...e),
      info: (...e) => log.info(TAGS.gql, ...e),
      warn: (...e) => log.warn(TAGS.gql, ...e),
      error: (...e) => log.error(TAGS.gql, ...e),
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
              const filterCount = Object.keys(
                requestContext.request?.variables?.filters || {},
              ).length

              if (
                response.body.kind === 'single' &&
                'data' in response.body.singleResult
              ) {
                const endpoint =
                  // @ts-ignore
                  operation?.selectionSet?.selections?.[0]?.name?.value

                const data = response.body.singleResult.data?.[endpoint]
                const returned = Array.isArray(data) ? data.length : 0

                if (contextValue.user) {
                  const now = Date.now()
                  state.userRequestCache.get(contextValue.user).push({
                    count: returned,
                    timestamp: now,
                    category: endpoint,
                  })

                  const entries = state.userRequestCache.get(contextValue.user)
                  state.userRequestCache.set(
                    contextValue.user,
                    entries.filter(
                      (entry) =>
                        now - entry.timestamp <=
                        config.getSafe('api.dataRequestLimits.time') * 1000,
                    ),
                  )
                }

                log.info(
                  TAGS[endpoint] || `[${endpoint?.toUpperCase()}]`,
                  '|',
                  operationName,
                  '|',
                  returned || 0,
                  '|',
                  `${Date.now() - contextValue.startTime}ms`,
                  '|',
                  contextValue.user || 'Not Logged In',
                  '|',
                  'Filters:',
                  filterCount || 0,
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

module.exports = startApollo
