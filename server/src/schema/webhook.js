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

const EggType = new GraphQLObjectType({
  name: 'PoracleEgg',
  fields: () => ({
    uid: { type: GraphQLInt },
    id: { type: GraphQLID },
    profile_no: { type: GraphQLInt },
    ping: { type: GraphQLString },
    exclusive: { type: GraphQLBoolean },
    level: { type: GraphQLInt },
    clean: { type: GraphQLBoolean },
    distance: { type: GraphQLInt },
    template: { type: GraphQLString },
    team: { type: GraphQLInt },
    gym_id: { type: GraphQLString },
  }),
})

const RaidType = new GraphQLObjectType({
  name: 'PoracleRaid',
  fields: () => ({
    uid: { type: GraphQLInt },
    id: { type: GraphQLID },
    profile_no: { type: GraphQLInt },
    ping: { type: GraphQLString },
    exclusive: { type: GraphQLBoolean },
    level: { type: GraphQLInt },
    clean: { type: GraphQLBoolean },
    distance: { type: GraphQLInt },
    template: { type: GraphQLString },
    team: { type: GraphQLInt },
    gym_id: { type: GraphQLString },
    form: { type: GraphQLInt },
    move: { type: GraphQLInt },
    pokemon_id: { type: GraphQLInt },
  }),
})

module.exports = new GraphQLObjectType({
  name: 'Webhook',
  fields: () => ({
    status: { type: GraphQLString },
    message: { type: GraphQLString },
    category: { type: GraphQLString },
    gym: { type: new GraphQLList(GymType) },
    egg: { type: new GraphQLList(EggType) },
    raid: { type: new GraphQLList(RaidType) },
  }),
})
