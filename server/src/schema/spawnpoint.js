import { GraphQLObjectType, GraphQLID, GraphQLInt, GraphQLFloat } from 'graphql'

export default new GraphQLObjectType({
  name: 'Spawnpoint',
  fields: () => ({
    id: { type: GraphQLID },
    lat: { type: GraphQLFloat },
    lon: { type: GraphQLFloat },
    updated: { type: GraphQLInt },
    despawn_sec: { type: GraphQLInt }
  })
})
