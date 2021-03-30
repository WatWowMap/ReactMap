const {
  GraphQLObjectType, GraphQLID, GraphQLInt, GraphQLFloat, GraphQLList,
} = require('graphql')

const PvpType = new GraphQLObjectType({
  name: 'Pvp',
  fields: () => ({
    level: { type: GraphQLFloat },
    pokemon: { type: GraphQLInt },
    form: { type: GraphQLInt },
    cp: { type: GraphQLInt },
    percentage: { type: GraphQLFloat },
  }),
})

module.exports = new GraphQLObjectType({
  name: 'Pokemon',
  fields: () => ({
    id: { type: GraphQLID },
    lat: { type: GraphQLFloat },
    lon: { type: GraphQLFloat },
    weight: { type: GraphQLFloat },
    size: { type: GraphQLFloat },
    expire_timestamp: { type: GraphQLInt },
    updated: { type: GraphQLInt },
    pokemon_id: { type: GraphQLInt },
    move_1: { type: GraphQLInt },
    move_2: { type: GraphQLInt },
    gender: { type: GraphQLInt },
    cp: { type: GraphQLInt },
    atk_iv: { type: GraphQLInt },
    def_iv: { type: GraphQLInt },
    sta_iv: { type: GraphQLInt },
    form: { type: GraphQLInt },
    weather: { type: GraphQLInt },
    costume: { type: GraphQLInt },
    first_seen_timestamp: { type: GraphQLInt },
    changed: { type: GraphQLInt },
    expire_timestamp_verified: { type: GraphQLInt },
    capture_1: { type: GraphQLFloat },
    capture_2: { type: GraphQLFloat },
    capture_3: { type: GraphQLFloat },
    greatLeague: { type: new GraphQLList(PvpType) },
    ultraLeague: { type: new GraphQLList(PvpType) },
  }),
})
