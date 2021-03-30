const {
  GraphQLObjectType, GraphQLID, GraphQLInt, GraphQLFloat,
} = require('graphql')

module.exports = new GraphQLObjectType({
  name: 'Spawnpoint',
  fields: () => ({
    id: { type: GraphQLID },
    lat: { type: GraphQLFloat },
    lon: { type: GraphQLFloat },
    updated: { type: GraphQLInt },
    despawn_sec: { type: GraphQLInt },
  }),
})
