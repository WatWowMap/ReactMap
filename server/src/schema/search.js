const {
  GraphQLObjectType, GraphQLString, GraphQLFloat, GraphQLInt,
} = require('graphql')

module.exports = new GraphQLObjectType({
  name: 'Search',
  fields: () => ({
    name: { type: GraphQLString },
    url: { type: GraphQLString },
    lat: { type: GraphQLFloat },
    lon: { type: GraphQLFloat },
    distance: { type: GraphQLFloat },
    quest_pokemon_id: { type: GraphQLInt },
    quest_form_id: { type: GraphQLInt },
    quest_gender_id: { type: GraphQLInt },
    quest_costume_id: { type: GraphQLInt },
    quest_item_id: { type: GraphQLInt },
    quest_reward_type: { type: GraphQLInt },
    quest_shiny: { type: GraphQLInt },
    mega_pokemon_id: { type: GraphQLInt },
    mega_amount: { type: GraphQLInt },
    stardust_amount: { type: GraphQLInt },
    item_amount: { type: GraphQLInt },
    candy_pokemon_id: { type: GraphQLInt },
    candy_amount: { type: GraphQLInt },
  }),
})
