const { GraphQLObjectType, GraphQLString, GraphQLFloat } = require('graphql')

module.exports = new GraphQLObjectType({
  name: 'Geocoder',
  fields: () => ({
    latitude: { type: GraphQLFloat },
    longitude: { type: GraphQLFloat },
    formattedAddress: { type: GraphQLString },
    streetNumber: { type: GraphQLString },
    streetName: { type: GraphQLString },
    neighborhood: { type: GraphQLString },
    suburb: { type: GraphQLString },
    city: { type: GraphQLString },
    state: { type: GraphQLString },
    zipcode: { type: GraphQLString },
    country: { type: GraphQLString },
    countryCode: { type: GraphQLString },
    provider: { type: GraphQLString },
  }),
})
