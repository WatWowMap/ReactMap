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

export interface PoracleHumanArea {
  name: string
  group: string
  userSelectable: boolean
}

export type PoracleCategory =
  | 'start'
  | 'stop'
  | 'switchProfile'
  | 'setLocation'
  | 'setAreas'
  | 'geojson'
  | 'areaSecurity'
  | 'humans'
  | 'profiles'
  | 'egg'
  | 'invasion'
  | 'lure'
  | 'nest'
  | 'pokemon'
  | 'quest'
  | 'raid'
  | 'gym'
  | 'quickGym'

export type PoracleAction =
  | 'add'
  | 'byProfileNo'
  | 'update'
  | 'update'
  | 'copy'
  | 'delete'

export type PoracleAPIInput =
  | PoracleCategory
  | `${PoracleCategory}-${PoracleAction}`

export interface PoracleAPIRef {
  config: '/api/config/poracleWeb'
  geofence: '/api/geofence/all/geojson'
  templates: '/api/config/templates?names=true'
  humans: (userId: number) => `/api/humans/${number}`
  oneHuman: (userId: number) => `/api/humans/one/${number}`
  location: (
    userId: number,
    location: [number, number],
  ) => `/api/humans/${number}/setLocation/${number}/${number}`
  areas: (userId: number) => `/api/humans/${number}/setAreas`
  areaSecurity: (userId: number) => `/api/geofence/${number}`
  start: (userId: number) => `/api/humans/${number}/start`
  stop: (userId: number) => `/api/humans/${number}/stop`
  switchProfile: (
    userId: number,
    profile: number,
  ) => `/api/humans/${number}/switchProfile/${number}`
  tracking: <Suffix extends string = ''>(
    userId: number,
    category: PoracleCategory,
    suffix?: Suffix = '' as const,
  ) => `/api/tracking/${typeof category}/${number}${Suffix extends ''
    ? ''
    : `/${Suffix}`}}`
  profiles: (userId: number) => `/api/profiles/${number}`
  profileAction: <Suffix extends string = ''>(
    userId: number,
    action: PoracleAction,
    suffix?: Suffix = '' as const,
  ) => `/api/profiles/${number}/${PoracleAction}${Suffix extends ''
    ? ''
    : `/${Suffix}`}`
}
