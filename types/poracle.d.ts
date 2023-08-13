export interface PoracleHuman {
  id: string
  type: string
  name: string
  enabled: boolean
  area: string
  latitude: number
  longitude: number
  fails: number
  last_checked: string
  language: string
  admin_disable: boolean
  disabled_date: string
  current_profile_no: number
  community_membership: string
  area_restrictions: string
  notes: string
  blocked_alerts: string
}

export interface PoracleProfile {
  uid: number
  id: string
  profile_no: number
  active_hours: string
  area: string
  latitude: number
  longitude: number
  name: string
}

export interface PoracleGym {
  uid: number
  id: string
  profile_no: number
  ping: string
  clean: boolean
  distance: number
  template: string
  team: number
  slot_changes: number
  gym_id: string
  description: string
}

export interface PoracleRaid {
  uid: number
  id: string
  profile_no: number
  ping: string
  exclusive: boolean
  level: number
  clean: boolean
  distance: number
  template: string
  team: number
  gym_id: string
  form: number
  move: number
  pokemon_id: number
  description: string
}

export interface PoracleEgg {
  uid: number
  id: string
  profile_no: number
  ping: string
  exclusive: boolean
  level: number
  clean: boolean
  distance: number
  template: string
  team: number
  gym_id: string
  description: string
}

export interface PoracleInvasion {
  uid: number
  id: string
  profile_no: number
  ping: string
  clean: boolean
  gender: number
  grunt_type: string
  template: string
  distance: number
  description: string
}

export interface PoraclePokemon {
  uid: number
  id: string
  ping: string
  clean: boolean
  pokemon_id: number
  distance: number
  min_iv: number
  max_iv: number
  min_cp: number
  max_cp: number
  min_level: number
  max_level: number
  atk: number
  def: number
  sta: number
  template: string
  min_weight: number
  max_weight: number
  form: number
  max_atk: number
  max_def: number
  max_sta: number
  gender: number
  profile_no: number
  min_time: number
  rarity: number
  max_rarity: number
  size: number
  max_size: number
  pvp_ranking_worst: number
  pvp_ranking_best: number
  pvp_ranking_min_cp: number
  pvp_ranking_league: number
  pvp_ranking_cap: number
  description: string
}

export interface PoracleLure {
  uid: number
  id: string
  profile_no: number
  ping: string
  clean: boolean
  lure_id: number
  template: string
  distance: number
  description: string
}

export interface PoracleQuest {
  uid: number
  id: string
  profile_no: number
  ping: string
  clean: boolean
  template: string
  distance: number
  amount: number
  form: number
  reward: number
  reward_type: number
  shiny: boolean
  description: string
}

export interface PoracleNest {
  uid: number
  id: string
  profile_no: number
  ping: string
  clean: boolean
  template: string
  distance: number
  min_spawn_avg: number
  pokemon_id: number
  form: number
}

export interface PoracleWeather {
  uid: number
  id: string
  profile_no: number
  ping: string
  clean: boolean
  template: string
  cell: number
  condition: number
  description: string
}

export interface Poracle {
  status: string
  message: string
  category: string
  human: PoracleHuman
  gym: PoracleGym[]
  egg: PoracleEgg[]
  raid: PoracleRaid[]
  pokemon: PoraclePokemon[]
  invasion: PoracleInvasion[]
  lure: PoracleLure[]
  quest: PoracleQuest[]
  profile: PoracleProfile[]
  nest: PoracleNest[]
  weather: PoracleWeather[]
}
