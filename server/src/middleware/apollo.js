// @ts-check
const { expressMiddleware } = require('@apollo/server/express4')
const { ApolloServerErrorCode } = require('@apollo/server/errors')
const { GraphQLError } = require('graphql')
const { parse } = require('graphql')
const NodeCache = require('node-cache')

const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')

const state = require('../services/state')
const pkg = require('../../../package.json')

const clientErrorLogCache = new NodeCache({ stdTTL: 60 })

/**
 *
 * @param {Awaited<ReturnType<import('../graphql/server')>>} server
 * @returns
 */
function apolloMiddleware(server) {
  return expressMiddleware(server, {
    context: async ({ req, res }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      const user = req?.user?.username || ''
      const id = req?.user?.id || 0

      const clientVHeader = req.headers['apollographql-client-version']
      const clientV =
        (typeof clientVHeader === 'string' && clientVHeader.trim()) ||
        pkg.version ||
        1
      const serverV = pkg.version || 1

      const definition =
        /** @type {import('graphql').OperationDefinitionNode} */ (
          parse(req.body.query).definitions.find(
            (d) => d.kind === 'OperationDefinition',
          )
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

      if (!state.userRequestCache.has(user)) {
        state.userRequestCache.set(user, [])
      }
      const now = Date.now()
      const userCache = state.userRequestCache
        .get(user)
        .filter(
          (entry) =>
            now - entry.timestamp <=
            config.getSafe('api.dataRequestLimits.time') * 1000,
        )

      let reqEndpoint =
        req.body.query.split(' on ')[1]?.split(' ')[0]?.toLowerCase() ||
        'unknown'
      if (
        reqEndpoint !== 'pokemon' &&
        reqEndpoint !== 'weather' &&
        reqEndpoint !== 'unknown'
      ) {
        reqEndpoint += 's'
      }
      const categoryCache = userCache.filter((r) => r.category === reqEndpoint)
      const userCategoryCount = categoryCache.reduce((a, b) => a + b.count, 0)

      const requestLimits = config.getSafe('api.dataRequestLimits.categories')

      const limit =
        reqEndpoint in requestLimits && requestLimits[reqEndpoint] > 0
          ? requestLimits[reqEndpoint]
          : Infinity

      if (reqEndpoint !== 'unknown') {
        log.debug(
          TAGS[reqEndpoint] || `[${reqEndpoint?.toUpperCase()}]`,
          user,
          '| current count:',
          userCategoryCount,
          '| config limit:',
          limit,
        )
      }
      if (userCategoryCount >= limit && categoryCache.length > 0) {
        const until =
          categoryCache[0].timestamp +
          config.getSafe('api.dataRequestLimits.time') * 1000

        if (!clientErrorLogCache.has(user)) {
          await state.event.chatLog('main', {
            title: `Data Limit Reached`,
            author: {
              name: user,
              icon_url: `https://cdn.discordapp.com/avatars/${req.user.discordId}/${req.user.avatar}.png`,
            },
            thumbnail: {
              url:
                config
                  .getSafe('authentication.strategies')
                  .find((strategy) => strategy.name === req?.user.rmStrategy)
                  ?.thumbnailUrl ??
                `https://user-images.githubusercontent.com/58572875/167069223-745a139d-f485-45e3-a25c-93ec4d09779c.png`,
            },
            description: `Has reached the data limit for ${reqEndpoint} requests (${userCategoryCount}/${limit}). They will be able to make requests again <t:${Math.ceil(
              until / 1000,
            )}:R> (${new Date(until).toLocaleTimeString()})`,
          })
          clientErrorLogCache.set(user, true)
        }

        throw new GraphQLError('data_limit_reached', {
          extensions: {
            ...errorCtx,
            until,
            http: { status: 429 },
            code: ApolloServerErrorCode.BAD_REQUEST,
          },
        })
      }
      if (clientErrorLogCache.has(user)) {
        clientErrorLogCache.del(user)
      }

      return {
        req,
        res,
        Db: state.db,
        Event: state.event,
        perms,
        user,
        token: req.headers.token,
        operation: definition?.operation,
      }
    },
  })
}

module.exports = { apolloMiddleware }
