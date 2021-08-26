const { GraphQLObjectType, GraphQLBoolean } = require('graphql')

module.exports = new GraphQLObjectType({
  name: 'Webhook',
  fields: () => ({
    status: { type: GraphQLBoolean },
  }),
})
