import { GraphQLObjectType, GraphQLID, GraphQLInt, GraphQLFloat, GraphQLBoolean } from 'graphql'

export default new GraphQLObjectType({
  name: 'Weather',
  fields: () => ({
    id: { type: GraphQLID },
    level: { type: GraphQLInt },
    latitude: { type: GraphQLFloat },
    longitude: { type: GraphQLFloat },
    gameplay_condition: { type: GraphQLInt },
    wind_direction: { type: GraphQLInt },
    cloud_level: { type: GraphQLInt },
    rain_level: { type: GraphQLInt },
    wind_level: { type: GraphQLInt },
    snow_level: { type: GraphQLInt },
    fog_level: { type: GraphQLInt },
    special_effect_level: { type: GraphQLInt },
    severity: { type: GraphQLBoolean },
    warn_weather: { type: GraphQLBoolean },
    updated: { type: GraphQLInt }
  })
})
