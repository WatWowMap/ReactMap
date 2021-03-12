import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLInt, GraphQLFloat } from 'graphql'

export default new GraphQLObjectType({
  name: 'Device',
  fields: () => ({
    uuid: { type: GraphQLID },
    instance_name: { type: GraphQLString },
    last_seen: { type: GraphQLInt },
    last_lat: { type: GraphQLFloat },
    last_lon: { type: GraphQLFloat },
  })
})
