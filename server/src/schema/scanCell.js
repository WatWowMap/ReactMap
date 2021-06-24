const {
  GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLFloat,
} = require('graphql')
const { JSONResolver } = require('graphql-scalars')

module.exports = new GraphQLObjectType({
  name: 'ScanCell',
  fields: () => ({
    id: { type: GraphQLString },
    level: { type: GraphQLInt },
    center_lat: { type: GraphQLFloat },
    center_lon: { type: GraphQLFloat },
    updated: { type: GraphQLInt },
    polygon: { type: JSONResolver },
  }),
})
