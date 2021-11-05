const {
  GraphQLObjectType, GraphQLString, GraphQLList, GraphQLFloat,
} = require('graphql')

const feature = new GraphQLObjectType({
  name: 'Feature',
  fields: {
    type: { type: GraphQLString },
    properties: {
      type: new GraphQLObjectType({
        name: 'ScanAreasName',
        fields: {
          name: { type: GraphQLString },
        },
      }),
    },
    geometry: {
      type: new GraphQLObjectType({
        name: 'ScanAreaGeometry',
        fields: {
          type: { type: GraphQLString },
          coordinates: {
            type: new GraphQLList(new GraphQLList(new GraphQLList(GraphQLFloat))),
          },
        },
      }),
    },
  },
})

module.exports = new GraphQLObjectType({
  name: 'ScanArea',
  fields: () => ({
    type: { type: GraphQLString },
    features: { type: new GraphQLList(feature) },
  }),
})
