const {
  GraphQLObjectType, GraphQLID, GraphQLString, GraphQLInt, GraphQLFloat, GraphQLBoolean, GraphQLList,
} = require('graphql')
const { JSONResolver } = require('graphql-scalars')

const quest = new GraphQLObjectType({
  name: 'Quest',
  fields: () => ({
    quest_type: { type: GraphQLInt },
    quest_timestamp: { type: GraphQLInt },
    quest_target: { type: GraphQLInt },
    quest_conditions: { type: JSONResolver },
    quest_rewards: { type: JSONResolver },
    quest_template: { type: JSONResolver },
    quest_reward_type: { type: GraphQLInt },
    quest_task: { type: GraphQLString },
    quest_item_id: { type: GraphQLInt },
    item_amount: { type: GraphQLInt },
    stardust_amount: { type: GraphQLInt },
    quest_pokemon_id: { type: GraphQLInt },
    quest_form_id: { type: GraphQLInt },
    quest_gender_id: { type: GraphQLInt },
    quest_costume_id: { type: GraphQLInt },
    quest_shiny: { type: GraphQLInt },
    mega_pokemon_id: { type: GraphQLInt },
    mega_amount: { type: GraphQLInt },
    candy_pokemon_id: { type: GraphQLInt },
    candy_amount: { type: GraphQLInt },
    with_ar: { type: GraphQLBoolean },
    key: { type: GraphQLString },
  }),
})

module.exports = new GraphQLObjectType({
  name: 'Pokestop',
  fields: () => ({
    id: { type: GraphQLID },
    lat: { type: GraphQLFloat },
    lon: { type: GraphQLFloat },
    name: { type: GraphQLString },
    url: { type: GraphQLString },
    lure_expire_timestamp: { type: GraphQLString },
    last_modified_timestamp: { type: GraphQLInt },
    updated: { type: GraphQLInt },
    lure_id: { type: GraphQLInt },
    pokestop_display: { type: GraphQLBoolean },
    incident_expire_timestamp: { type: GraphQLInt },
    grunt_type: { type: GraphQLInt },
    first_seen_timestamp: { type: GraphQLInt },
    sponsor_id: { type: GraphQLInt },
    ar_scan_eligible: { type: GraphQLInt },
    quests: { type: new GraphQLList(quest) },
  }),
})
