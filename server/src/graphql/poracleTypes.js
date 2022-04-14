const { gql } = require('apollo-server-express')

module.exports = gql`
  type PoracleHuman {
    id: ID
    type: String
    name: String
    enabled: Boolean
    area: String
    latitude: Float
    longitude: Float
    fails: Int
    last_checked: String
    language: String
    admin_disable: Boolean
    disabled_date: String
    current_profile_no: Int
    community_membership: String
    area_restrictions: String
    notes: String
    blocked_alerts: String
  }

  type PoracleProfile {
    uid: Int
    id: ID
    profile_no: Int
    active_hours: String
    area: String
    latitude: Float
    longitude: Float
    name: String
  }

  type PoracleGym {
    uid: Int
    id: ID
    profile_no: Int
    ping: String
    clean: Boolean
    distance: Int
    template: String
    team: Int
    slot_changes: Int
    gym_id: String
    description: String
  }

  type PoracleRaid {
    uid: Int
    id: ID
    profile_no: Int
    ping: String
    exclusive: Boolean
    level: Int
    clean: Boolean
    distance: Int
    template: String
    team: Int
    gym_id: String
    form: Int
    move: Int
    pokemon_id: Int
    description: String
  }

  type PoracleEgg {
    uid: Int
    id: ID
    profile_no: Int
    ping: String
    exclusive: Boolean
    level: Int
    clean: Boolean
    distance: Int
    template: String
    team: Int
    gym_id: String
    description: String
  }

  type PoracleInvasion {
    uid: Int
    id: ID
    profile_no: Int
    ping: String
    clean: Boolean
    gender: Int
    grunt_type: String
    template: String
    distance: Int
    description: String
  }

  type PoraclePokemon {
    uid: Int
    id: ID
    ping: String
    clean: Boolean
    pokemon_id: Int
    distance: Int
    min_iv: Int
    max_iv: Int
    min_cp: Int
    max_cp: Int
    min_level: Int
    max_level: Int
    atk: Int
    def: Int
    sta: Int
    template: String
    min_weight: Int
    max_weight: Int
    form: Int
    max_atk: Int
    max_def: Int
    max_sta: Int
    gender: Int
    profile_no: Int
    min_time: Int
    rarity: Int
    max_rarity: Int
    pvp_ranking_worst: Int
    pvp_ranking_best: Int
    pvp_ranking_min_cp: Int
    pvp_ranking_league: Int
    pvp_ranking_cap: Int
    description: String
  }

  type PoracleLure {
    uid: Int
    id: ID
    profile_no: Int
    ping: String
    clean: Boolean
    lure_id: Int
    template: String
    distance: Int
    description: String
  }

  type PoracleQuest {
    uid: Int
    id: ID
    profile_no: Int
    ping: String
    clean: Boolean
    template: String
    distance: Int
    amount: Int
    form: Int
    reward: Int
    reward_type: Int
    shiny: Boolean
    description: String
  }
  
  type PoracleNest {
    uid: Int
    id: ID
    profile_no: Int
    ping: String
    clean: Boolean
    template: String
    distance: Int
    min_spawn_avg: Int
    pokemon_id: Int
    form: Int
  }

  type PoracleWeather {
    uid: Int
    id: ID
    profile_no: Int
    ping: String
    clean: Boolean
    template: String
    cell: Int
    condition: Int
    description: String
  }

  type Poracle {
    status: String
    message: String
    category: String
    human: PoracleHuman
    gym: [PoracleGym]
    egg: [PoracleEgg]
    raid: [PoracleRaid]
    pokemon: [PoraclePokemon]
    invasion: [PoracleInvasion]
    lure: [PoracleLure]
    quest: [PoracleQuest]
    profile: [PoracleProfile]
    nest: [PoracleNest]
    weather: [PoracleWeather]
  }
`
