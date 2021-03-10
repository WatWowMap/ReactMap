import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLInt, GraphQLBoolean, GraphQLFloat } from 'graphql'

export default new GraphQLObjectType({
  name: 'Gym',
  fields: () => ({
    id: { type: GraphQLID },
    lat: { type: GraphQLFloat },
    lon: { type: GraphQLFloat },
    name: { type: GraphQLString },
    url: { type: GraphQLString },
    last_modified_timestamp: { type: GraphQLInt },
    raid_end_timestamp: { type: GraphQLInt },
    raid_spawn_timestamp: { type: GraphQLInt },
    raid_battle_timestamp: { type: GraphQLInt },
    updated: { type: GraphQLInt },
    raid_pokemon_id: { type: GraphQLInt },
    guarding_pokemon_id: { type: GraphQLInt },
    availble_slots: { type: GraphQLInt },
    team_id: { type: GraphQLInt },
    raid_level: { type: GraphQLInt },
    ex_raid_eligible: { type: GraphQLBoolean },
    in_battle: { type: GraphQLBoolean },
    raid_pokemon_move_1: { type: GraphQLInt },
    raid_pokemon_move_2: { type: GraphQLInt },
    raid_pokemon_form: { type: GraphQLInt },
    raid_pokemon_cp: { type: GraphQLInt },
    raid_is_exclusive: { type: GraphQLBoolean },
    total_cp: { type: GraphQLInt },
    first_seen_timestamp: { type: GraphQLInt },
    sponsor_id: { type: GraphQLInt },
    raid_pokemon_costume: { type: GraphQLInt },
    raid_pokemon_evolution: { type: GraphQLInt }
  })
})
