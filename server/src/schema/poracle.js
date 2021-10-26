const {
  GraphQLObjectType, GraphQLString, GraphQLList, GraphQLInt, GraphQLID, GraphQLBoolean, GraphQLFloat,
} = require('graphql')

const HumanType = new GraphQLObjectType({
  name: 'PoracleHuman',
  fields: () => ({
    id: { type: GraphQLID },
    type: { type: GraphQLString },
    name: { type: GraphQLString },
    enabled: { type: GraphQLBoolean },
    area: { type: GraphQLString },
    latitude: { type: GraphQLFloat },
    longitude: { type: GraphQLFloat },
    fails: { type: GraphQLInt },
    last_checked: { type: GraphQLString },
    language: { type: GraphQLString },
    admin_disable: { type: GraphQLBoolean },
    disabled_date: { type: GraphQLString },
    current_profile_no: { type: GraphQLInt },
    community_membership: { type: GraphQLString },
    area_restrictions: { type: GraphQLString },
    notes: { type: GraphQLString },
    blocked_alerts: { type: GraphQLInt },
  }),
})

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
    description: { type: GraphQLString },
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
    description: { type: GraphQLString },
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
    description: { type: GraphQLString },
  }),
})

const PokemonType = new GraphQLObjectType({
  name: 'PoraclePokemon',
  fields: () => ({
    uid: { type: GraphQLInt },
    id: { type: GraphQLID },
    ping: { type: GraphQLString },
    clean: { type: GraphQLBoolean },
    pokemon_id: { type: GraphQLInt },
    distance: { type: GraphQLInt },
    min_iv: { type: GraphQLInt },
    max_iv: { type: GraphQLInt },
    min_cp: { type: GraphQLInt },
    max_cp: { type: GraphQLInt },
    min_level: { type: GraphQLInt },
    max_level: { type: GraphQLInt },
    atk: { type: GraphQLInt },
    def: { type: GraphQLInt },
    sta: { type: GraphQLInt },
    template: { type: GraphQLString },
    min_weight: { type: GraphQLInt },
    max_weight: { type: GraphQLInt },
    form: { type: GraphQLInt },
    max_atk: { type: GraphQLInt },
    max_def: { type: GraphQLInt },
    max_sta: { type: GraphQLInt },
    gender: { type: GraphQLInt },
    profile_no: { type: GraphQLInt },
    min_time: { type: GraphQLInt },
    rarity: { type: GraphQLInt },
    max_rarity: { type: GraphQLInt },
    pvp_ranking_worst: { type: GraphQLInt },
    pvp_ranking_best: { type: GraphQLInt },
    pvp_ranking_min_cp: { type: GraphQLInt },
    pvp_ranking_league: { type: GraphQLInt },
    description: { type: GraphQLString },
  }),
})

const InvasionType = new GraphQLObjectType({
  name: 'PoracleInvasion',
  fields: () => ({
    uid: { type: GraphQLInt },
    id: { type: GraphQLID },
    profile_no: { type: GraphQLInt },
    ping: { type: GraphQLString },
    clean: { type: GraphQLBoolean },
    gender: { type: GraphQLInt },
    grunt_type: { type: GraphQLString },
    template: { type: GraphQLString },
    distance: { type: GraphQLInt },
    description: { type: GraphQLString },
  }),
})

const LureType = new GraphQLObjectType({
  name: 'PoracleLure',
  fields: () => ({
    uid: { type: GraphQLInt },
    id: { type: GraphQLID },
    profile_no: { type: GraphQLInt },
    ping: { type: GraphQLString },
    clean: { type: GraphQLBoolean },
    lure_id: { type: GraphQLInt },
    template: { type: GraphQLString },
    distance: { type: GraphQLInt },
    description: { type: GraphQLString },
  }),
})

const QuestType = new GraphQLObjectType({
  name: 'PoracleQuest',
  fields: () => ({
    uid: { type: GraphQLInt },
    id: { type: GraphQLID },
    profile_no: { type: GraphQLInt },
    ping: { type: GraphQLString },
    clean: { type: GraphQLBoolean },
    template: { type: GraphQLString },
    distance: { type: GraphQLInt },
    amount: { type: GraphQLInt },
    form: { type: GraphQLInt },
    reward: { type: GraphQLInt },
    reward_type: { type: GraphQLInt },
    shiny: { type: GraphQLBoolean },
    description: { type: GraphQLString },
  }),
})

const ProfileType = new GraphQLObjectType({
  name: 'PoracleProfile',
  fields: () => ({
    uid: { type: GraphQLInt },
    id: { type: GraphQLID },
    profile_no: { type: GraphQLInt },
    active_hours: { type: GraphQLString },
    area: { type: GraphQLString },
    latitude: { type: GraphQLFloat },
    longitude: { type: GraphQLFloat },
    name: { type: GraphQLString },
  }),
})

const NestType = new GraphQLObjectType({
  name: 'PoracleNest',
  fields: () => ({
    uid: { type: GraphQLInt },
    id: { type: GraphQLID },
    profile_no: { type: GraphQLInt },
    ping: { type: GraphQLString },
    clean: { type: GraphQLBoolean },
    template: { type: GraphQLString },
    distance: { type: GraphQLInt },
    min_spawn_avg: { type: GraphQLInt },
    pokemon_id: { type: GraphQLInt },
    description: { type: GraphQLString },
  }),
})

const WeatherType = new GraphQLObjectType({
  name: 'PoracleWeather',
  fields: () => ({
    uid: { type: GraphQLInt },
    id: { type: GraphQLID },
    profile_no: { type: GraphQLInt },
    ping: { type: GraphQLString },
    clean: { type: GraphQLBoolean },
    template: { type: GraphQLString },
    cell: { type: GraphQLInt },
    condition: { type: GraphQLInt },
    description: { type: GraphQLString },
  }),
})

module.exports = new GraphQLObjectType({
  name: 'Poracle',
  fields: () => ({
    status: { type: GraphQLString },
    message: { type: GraphQLString },
    category: { type: GraphQLString },
    human: { type: HumanType },
    gym: { type: new GraphQLList(GymType) },
    egg: { type: new GraphQLList(EggType) },
    raid: { type: new GraphQLList(RaidType) },
    pokemon: { type: new GraphQLList(PokemonType) },
    invasion: { type: new GraphQLList(InvasionType) },
    lure: { type: new GraphQLList(LureType) },
    quest: { type: new GraphQLList(QuestType) },
    profile: { type: new GraphQLList(ProfileType) },
    nest: { type: new GraphQLList(NestType) },
    weather: { type: new GraphQLList(WeatherType) },
  }),
})
