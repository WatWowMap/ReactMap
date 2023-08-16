import { useQuery } from '@apollo/client'
import { HttpMethod } from './general'
import { Split } from './utility'

export interface PoracleHuman<Parsed extends boolean = true> {
  id: string
  type: string
  name: string
  enabled: boolean
  area: Parsed extends true ? string[] : string
  latitude: number
  longitude: number
  fails: number
  last_checked: string
  language: string
  admin_disable: boolean
  disabled_date: string
  current_profile_no: number
  community_membership: Parsed extends true ? string[] : string
  area_restrictions: Parsed extends true ? string[] : string
  notes: string
  blocked_alerts: Parsed extends true ? string[] : string
}

export interface PoracleActiveHours {
  id: number
  day: number
  hours: string
  mins: string
}

export interface PoracleProfile<Parsed extends boolean = true> {
  uid: number
  id: string
  profile_no: number
  active_hours: Parsed extends true ? PoracleActiveHours[] : string
  area: Parsed extends true ? string[] : string
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
  description?: string
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
  real_grunt_id?: number
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
  description?: string
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
  | 'human'
  | 'humans'
  | 'oneHuman'
  | 'profile'
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
  profileAction: <
    Action extends PoracleAction = '',
    Suffix extends string = '',
  >(
    userId: number,
    action?: Action = '' as const,
    suffix?: Suffix = '' as const,
  ) => `/api/profiles/${number}/${Action extends ''
    ? ''
    : `/${Action}`}${Suffix extends '' ? '' : `/${Suffix}`}`
}

export type PoracleUI = ReturnType<
  import('../server/src/services/api/Poracle')['buildPoracleUi']
>

export type PoracleDefault<T extends keyof Omit<PoracleUI, 'human'>> =
  PoracleUI[T]['defaults']

export type PoracleClientContext = Omit<
  ReturnType<import('../server/src/services/api/Poracle')['getClientContext']>,
  'ui'
> & {
  ui: PoracleUI
}

interface APIReturnType {
  humans: PoracleHuman
  oneHuman: PoracleHuman
  switchProfile: PoracleHuman
  start: PoracleHuman
  stop: PoracleHuman
  pokemon: PoraclePokemon[]
  invasion: PoracleInvasion[]
  lure: PoracleLure[]
  quest: PoracleQuest[]
  nest: PoracleNest[]
  weather: PoracleWeather[]
  profile: PoracleProfile[]
  profiles: PoracleProfile[]
  gym: PoracleGym[]
  quickGym: PoracleGym[]
  egg: PoracleEgg[]
  raid: PoracleRaid[]
}

export type APIMethod<T extends PoracleAPIInput = PoracleAPIInput> = (
  userId: number,
  category: T,
  method: HttpMethod,
  data: any,
) => Promise<APIReturnType[Split<T, '-'>[0]]>

export type ApolloQueryReturn<T extends APIReturnType[keyof APIReturnType]> =
  ReturnType<typeof useQuery<{ webhook: T }>>
