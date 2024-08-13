// @ts-check
const { expressMiddleware } = require('@apollo/server/express4')
const { ApolloServerErrorCode } = require('@apollo/server/errors')
const { GraphQLError } = require('graphql')
const { parse } = require('graphql')

const state = require('../services/state')
const pkg = require('../../../package.json')
const { DataLimitCheck } = require('../services/DataLimitCheck')

/**
 *
 * @param {Awaited<ReturnType<import('../graphql/server')>>} server
 * @returns
 */
function apolloMiddleware(server) {
  return expressMiddleware(server, {
    context: async ({ req, res }) => {
      const perms = req.user ? req.user.perms : req.session.perms
      const username = req?.user?.username || ''
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
      const userDataLimit = new DataLimitCheck(req)

      const errorCtx = {
        id,
        user: username,
        clientV,
        serverV,
        endpoint: userDataLimit.category,
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

      if (await userDataLimit.isOverLimit()) {
        throw new GraphQLError('data_limit_reached', {
          extensions: {
            ...errorCtx,
            until: userDataLimit.until,
            http: { status: 429 },
            code: ApolloServerErrorCode.BAD_REQUEST,
          },
        })
      }

      return {
        userId: id,
        username,
        req,
        res,
        Db: state.db,
        Event: state.event,
        perms,
        token: req.headers.token,
        operation: definition?.operation,
      }
    },
  })
}

module.exports = { apolloMiddleware }
