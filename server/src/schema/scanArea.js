const { GraphQLObjectType, GraphQLString } = require('graphql')
const { JSONResolver } = require('graphql-scalars')

module.exports = new GraphQLObjectType({
  name: 'ScanArea',
  fields: () => ({
    type: { type: GraphQLString },
    properties: { type: JSONResolver },
    geometry: { type: JSONResolver },
    features: { type: JSONResolver },
  }),
})
