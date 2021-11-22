const { gql } = require('apollo-server-express')

module.exports = gql`
  type Device {
    uuid: ID
    instance_name: String
    last_seen: Int
    last_lat: Float
    last_lon: Float
    type: String
    isMad: Boolean
    route: String
  }

  type Gym {
    id: ID
    lat: Float
    lon: Float
    name: String
    url: String
    last_modified_timestamp: Int
    raid_end_timestamp: Int
    raid_spawn_timestamp: Int
    raid_battle_timestamp: Int
    raid_pokemon_id: Int
    updated: Int
    guarding_pokemon_id: Int
    availble_slots: Int
    team_id: Int
    raid_level: Int
    ex_raid_eligible: Boolean
    in_battle: Boolean
    raid_pokemon_move_1: Int
    raid_pokemon_move_2: Int
    raid_pokemon_form: Int
    raid_pokemon_cp: Int
    raid_is_exclusive: Boolean
    total_cp: Int
    first_seen_timestamp: Int
    sponsor_id: Int
    raid_pokemon_costume: Int
    raid_pokemon_gender: Int
    raid_pokemon_evolution: Int
    ar_scan_eligible: Boolean
  }

  type Nest {
    nest_id: ID
    lat: Float
    lon: Float
    pokemon_id: Int
    updated: Int
    type: Int
    nest_submitted_by: String
    name: String
    pokemon_count: Int
    pokemon_avg: Float
    pokemon_form: Int
    polygon_type: Int
    polygon_path: String
  }

  type Quest {
    quest_type: Int
    quest_timestamp: Int
    quest_target: Int
    quest_conditions: String
    quest_rewards: String
    quest_template: String
    quest_reward_type: Int
    quest_task: String
    quest_item_id: Int
    quest_title: String
    item_amount: Int
    stardust_amount: Int
    quest_pokemon_id: Int
    quest_form_id: Int
    quest_gender_id: Int
    quest_costume_id: Int
    quest_shiny: Int
    mega_pokemon_id: Int
    mega_amount: Int
    candy_pokemon_id: Int
    candy_amount: Int
    xl_candy_pokemon_id: Int
    xl_candy_amount: Int
    with_ar: Boolean
    key: String
  }

  type Invasion {
    grunt_type: Int
    incident_expire_timestamp: Int
  }

  type Pokestop {
    id: ID
    lat: Float
    lon: Float
    url: String
    name: String
    lure_id: Int
    lure_expire_timestamp: Int
    updated: Int
    last_modified_timestamp: Int
    pokestop_display: Int
    first_seen_timestamp: Int
    sponsor_id: Int
    ar_scan_eligible: Boolean
    quests: [Quest]
    invasions: [Invasion]
  }

  type Pokemon {
    id: ID
    encounter_id: Int
    spawnpoint_id: String
    lat: Float
    lon: Float
    pokemon_id: Int
    form: Int
    costume: Int
    gender: Int
    display_pokemon_id: Int
    ditto_form: Int
    weight: Float
    size: Float
    move_1: Int
    move_2: Int
    cp: Int
    level: Int
    iv: Float
    atk_iv: Int
    def_iv: Int
    sta_iv: Int
    weather: Int
    capture_1: Float
    capture_2: Float
    capture_3: Float
    cleanPvp: JSON
    bestPvp: Int
    seen_type: String
    inactive_stats: Boolean
    changed: Boolean
    expire_timestamp: Int
    first_seen_timestamp: Int
    expire_timestamp_verified: Boolean
    updated: Int
  }

  type Portal {
    id: ID
    external_id: String
    lat: Float
    lon: Float
    name: String
    url: String
    imported: Int
    updated: Int
  }

  type S2cell {
    id: ID
    level: Int
    center_lat: Float
    center_lon: Float
    updated: Int
    polygon: [[Float]]
  }

  type Spawnpoint {
    id: ID
    lat: Float
    lon: Float
    updated: Int
    despawn_sec: Int
  }

  type Weather {
    id: String
    level: Int
    latitude: Float
    longitude: Float
    gameplay_condition: Int
    wind_direction: Int
    cloud_level: Int
    rain_level: Int
    wind_level: Int
    snow_level: Int
    fog_level: Int
    special_effect_level: Int
    severity: Boolean
    warn_weather: Boolean
    updated: Int
    polygon: [[Float]]
  }
`
