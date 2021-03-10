import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLInt, GraphQLBoolean, GraphQLFloat } from 'graphql'
import { GraphQLJSON } from 'graphql-type-json'

const QuestType = new GraphQLObjectType({
  name: 'Conditions',
  fields: () => ({
    type: { type: GraphQLInt },
    info: { type: GraphQLJSON }
  })
})

export default new GraphQLObjectType({
  name: 'Pokestop',
  fields: () => ({
    id: { type: GraphQLID },
    lat: { type: GraphQLFloat  },
    lon: { type: GraphQLFloat },
    name: { type: GraphQLString },
    url: { type: GraphQLString },
    lure_expire_timestamp: { type: GraphQLString },
    last_modified_timestamp: { type: GraphQLInt },
    updated: { type: GraphQLInt },
    quest_type: { type: GraphQLInt },
    quest_timestamp: { type: GraphQLInt },
    quest_target: { type: GraphQLInt },
    quest_conditions: { type: GraphQLJSON },
    quest_rewards: { type: GraphQLJSON },
    quest_template: { type: GraphQLString },
    quest_reward_type: { type: GraphQLInt },
    quest_item_id: { type: GraphQLInt },
    lure_id: { type: GraphQLInt },
    pokestop_display: { type: GraphQLBoolean },
    incident_expire_timestamp: { type: GraphQLInt },
    grunt_type: { type: GraphQLInt },
    first_seen_timestamp: { type: GraphQLInt },
    sponsor_id: { type: GraphQLInt },
    quest_pokemon_id: { type: GraphQLInt }
  })
})
