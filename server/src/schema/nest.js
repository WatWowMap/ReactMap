const {
  GraphQLObjectType, GraphQLID, GraphQLString, GraphQLInt, GraphQLFloat,
} = require('graphql')
const { JSONResolver } = require('graphql-scalars')

module.exports = new GraphQLObjectType({
  name: 'Nest',
  fields: () => ({
    nest_id: { type: GraphQLID },
    lat: { type: GraphQLFloat },
    lon: { type: GraphQLFloat },
    pokemon_id: { type: GraphQLInt },
    updated: { type: GraphQLInt },
    type: { type: GraphQLInt },
    nest_submitted_by: { type: GraphQLString },
    name: { type: GraphQLString },
    pokemon_count: { type: GraphQLInt },
    pokemon_avg: { type: GraphQLFloat },
    pokemon_form: { type: GraphQLInt },
    polygon_type: { type: GraphQLInt },
    polygon_path: { type: JSONResolver },
  }),
})
