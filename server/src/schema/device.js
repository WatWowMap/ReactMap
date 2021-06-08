const {
  GraphQLObjectType, GraphQLID, GraphQLString, GraphQLInt, GraphQLFloat, GraphQLBoolean,
} = require('graphql')
const { JSONResolver } = require('graphql-scalars')

module.exports = new GraphQLObjectType({
  name: 'Device',
  fields: () => ({
    uuid: { type: GraphQLID },
    instance_name: { type: GraphQLString },
    last_seen: { type: GraphQLInt },
    last_lat: { type: GraphQLFloat },
    last_lon: { type: GraphQLFloat },
    type: { type: GraphQLString },
    route: { type: JSONResolver },
    isMad: { type: GraphQLBoolean },
  }),
})
