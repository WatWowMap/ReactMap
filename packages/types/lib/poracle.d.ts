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
  /** Hours between repeats; set (> 0) on a range entry. */
  step?: number
  end_hours?: number
  end_mins?: number
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

/** A tracking rule as PoracleNG v2 returns it (`null` = any). */
export type PoracleRule = {
  uid?: number
  description?: string
} & Record<string, unknown>

export type PoracleGym = PoracleRule
export type PoracleRaid = PoracleRule
export type PoracleEgg = PoracleRule
export type PoracleInvasion = PoracleRule
export type PoracleIncident = PoracleRule
export type PoraclePokemon = PoracleRule
export type PoracleLure = PoracleRule
export type PoracleQuest = PoracleRule
export type PoracleNest = PoracleRule

export interface Poracle {
  status: string
  message: string
  category: string
  human: PoracleHuman
  profile: PoracleProfile[]
  pokemon: PoracleRule[]
  raid: PoracleRule[]
  egg: PoracleRule[]
  quest: PoracleRule[]
  invasion: PoracleRule[]
  incident: PoracleRule[]
  lure: PoracleRule[]
  nest: PoracleRule[]
  gym: PoracleRule[]
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
  | 'incident'
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
  import('server/src/services/Poracle').PoracleAPI['generateUi']
>

export type PoracleDefault<T extends keyof Omit<PoracleUI, 'human'>> =
  PoracleUI[T]['defaults']

export type PoracleClientContext = Omit<
  ReturnType<
    import('server/src/services/Poracle').PoracleAPI['getClientContext']
  >,
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
  incident: PoracleIncident[]
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

export type PoracleCategories = keyof PoracleUI

export type AllButHuman = Exclude<PoracleCategories, 'human'>
