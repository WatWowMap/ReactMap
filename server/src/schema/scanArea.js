const {
  GraphQLObjectType, GraphQLString, GraphQLList, GraphQLFloat,
} = require('graphql')

const properties = new GraphQLObjectType({
  name: 'Properties',
  fields: {
    name: { type: GraphQLString },
  },
})

const geometry = new GraphQLObjectType({
  name: 'ScanAreaGeometry',
  fields: {
    type: { type: GraphQLString },
    coordinates: { type: new GraphQLList(new GraphQLList(new GraphQLList(GraphQLFloat))) },
  },
})

const feature = new GraphQLObjectType({
  name: 'Feature',
  fields: {
    type: { type: GraphQLString },
    properties: { type: properties },
    geometry: { type: geometry },
  },
})

module.exports = new GraphQLObjectType({
  name: 'ScanArea',
  fields: () => ({
    type: { type: GraphQLString },
    features: { type: new GraphQLList(feature) },
  }),
})
