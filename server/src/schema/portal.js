const {
  GraphQLObjectType, GraphQLID, GraphQLString, GraphQLInt, GraphQLFloat,
} = require('graphql')

module.exports = new GraphQLObjectType({
  name: 'Portal',
  fields: () => ({
    id: { type: GraphQLID },
    external_id: { type: GraphQLString },
    lat: { type: GraphQLFloat },
    lon: { type: GraphQLFloat },
    name: { type: GraphQLString },
    url: { type: GraphQLString },
    imported: { type: GraphQLInt },
    updated: { type: GraphQLInt },
  }),
})
