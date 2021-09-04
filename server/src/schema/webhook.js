const {
  GraphQLObjectType, GraphQLString, GraphQLList, GraphQLInt, GraphQLID, GraphQLBoolean,
} = require('graphql')

const GymType = new GraphQLObjectType({
  name: 'PoracleGym',
  fields: () => ({
    uid: { type: GraphQLInt },
    id: { type: GraphQLID },
    profile_no: { type: GraphQLInt },
    ping: { type: GraphQLString },
    clean: { type: GraphQLBoolean },
    distance: { type: GraphQLInt },
    template: { type: GraphQLString },
    team: { type: GraphQLInt },
    slot_changes: { type: GraphQLInt },
    gym_id: { type: GraphQLString },
  }),
})

module.exports = new GraphQLObjectType({
  name: 'Webhook',
  fields: () => ({
    status: { type: GraphQLString },
    category: { type: GraphQLString },
    method: { type: GraphQLString },
    gym: { type: new GraphQLList(GymType) },
  }),
})
