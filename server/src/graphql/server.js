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
const config = require('@rm/config')

const { log, HELPERS } = require('@rm/logger')
const resolvers = require('./resolvers')

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
    introspection: config.getSafe('devOptions.enabled'),
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
      }

      const key = `${e.extensions.id || e.extensions.user}-${e.message}`
      if (errorCache.has(key)) {
        return e
      }
      if (!config.getSafe('devOptions.enabled')) {
        errorCache.set(key, true)
      }

      const endpoint = /** @type {string} */ (e.extensions.endpoint)

      log[customMessage ? 'info' : 'error'](
        HELPERS.gql,
        HELPERS[endpoint] || `[${endpoint?.toUpperCase()}]`,
        'Client:',
        e.extensions.clientV,
        'Server:',
        e.extensions.serverV,
        'User:',
        e.extensions.user || 'Not Logged In',
        e.extensions.id || '',
        customMessage || e,
      )
      return e
    },
    logger: {
      debug: (...e) => log.debug(HELPERS.gql, ...e),
      info: (...e) => log.info(HELPERS.gql, ...e),
      warn: (...e) => log.warn(HELPERS.gql, ...e),
      error: (...e) => log.error(HELPERS.gql, ...e),
    },
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async requestDidStart(requestContext) {
          requestContext.contextValue.startTime = Date.now()

          return {
            async willSendResponse(context) {
              const filterCount = Object.keys(
                requestContext.request?.variables?.filters || {},
              ).length

              const { response, contextValue } = context
              if (
                response.body.kind === 'single' &&
                'data' in response.body.singleResult
              ) {
                const endpoint =
                  // @ts-ignore
                  context?.operation?.selectionSet?.selections?.[0]?.name?.value

                const data = response.body.singleResult.data?.[endpoint]
                const returned = Array.isArray(data) ? data.length : 0

                log.info(
                  HELPERS[endpoint] || `[${endpoint?.toUpperCase()}]`,
                  '|',
                  context.operationName,
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

                if (returned && config.getSafe('sentry.server.enabled')) {
                  contextValue.transaction.setMeasurement(
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
