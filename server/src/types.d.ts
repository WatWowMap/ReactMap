import { LEAGUES } from './services/filters/pokemon/constants'
import type {
  ScannerModels,
  ScannerModelKeys,
  RmModels,
  RmModelKeys,
  ModelKeys,
} from './models'
import { Knex } from 'knex'
import { Model } from 'objection'
import { Request, Response } from 'express'
import { Transaction } from '@sentry/node'

import DbCheck = require('./services/DbCheck')
import EventManager = require('./services/EventManager')
import Pokemon = require('./models/Pokemon')
import Gym = require('./models/Gym')
import Badge = require('./models/Badge')
import Backup = require('./models/Backup')
import Nest = require('./models/Nest')
import NestSubmission = require('./models/NestSubmission')
import Pokestop = require('./models/Pokestop')

export interface DbContext {
  isMad: boolean
  pvpV2: boolean
  mem: string
  secret: string
  hasSize: boolean
  hasHeight: boolean
  hasRewardAmount: boolean
  hasPowerUp: boolean
  hasAltQuests: boolean
  hasLayerColumn: boolean
  hasMultiInvasions: boolean
  multiInvasionMs: boolean
  hasConfirmed: boolean
  availableSlotsCol: string
  polygon: boolean
  hasAlignment: boolean
}

export interface Perms {
  map: boolean
  pokemon: boolean
  iv: boolean
  pvp: boolean
  gyms: boolean
  raids: boolean
  pokestops: boolean
  eventStops: boolean
  quests: boolean
  lures: boolean
  portals: boolean
  submissionCells: boolean
  invasions: boolean
  nests: boolean
  scanAreas: boolean
  weather: boolean
  spawnpoints: boolean
  s2cells: boolean
  scanCells: boolean
  devices: boolean
  donor: boolean
  gymBadges: boolean
  backups: boolean
  areaRestrictions: string[]
  webhooks: string[]
  scanner: string[]
}

export interface Pokemon {
  id: string
  encounter_id: number
  spawnpoint_id: string
  lat: number
  lon: number
  pokemon_id: number
  form: number
  costume: number
  gender: number
  display_pokemon_id: number
  ditto_form: number
  weight: number
  height: number
  size: number
  move_1: number
  move_2: number
  cp: number
  level: number
  iv: number
  atk_iv: number
  def_iv: number
  sta_iv: number
  weather: number
  capture_1: number
  capture_2: number
  capture_3: number
  cleanPvp: CleanPvp
  bestPvp: number
  seen_type: string
  changed: boolean
  expire_timestamp: number
  first_seen_timestamp: number
  expire_timestamp_verified: boolean
  updated: number
}

export interface AvailablePokemon {
  id: number
  form: number
  count: number
}

export interface Available {
  pokemon: Awaited<ReturnType<(typeof Pokemon)['getAvailable']>>
  gyms: Awaited<ReturnType<(typeof Gym)['getAvailable']>>
  pokestops: Awaited<ReturnType<(typeof Pokestop)['getAvailable']>>
  nests: Awaited<ReturnType<(typeof Nest)['getAvailable']>>
}

export interface PvpEntry {
  pokemon: number
  form: number
  cap: number
  value: number
  level: number
  cp: number
  percentage: number
  rank: number
  capped: boolean
  evolution: number
}

export interface ApiEndpoint {
  type: string
  endpoint: string
  secret: string
  useFor: Lowercase<ModelKeys>[]
}

export interface DbConnection {
  host: string
  port: number
  username: string
  password: string
  database: string
  useFor: Lowercase<ModelKeys>[]
}

export type Schema = ApiEndpoint | DbConnection

export type CleanPvp = { [league in (typeof LEAGUES)[number]]?: PvpEntry }

export interface DbCheckClass {
  models: {
    [key in ScannerModelKeys]?: (DbContext & {
      connection: number
      SubModel: ScannerModels[key]
    })[]
  } & Partial<RmModels>
  validModels: ScannerModelKeys[]
  singleModels: readonly RmModelKeys[]
  searchLimit: number
  endpoints: { [key: number]: ApiEndpoint }
  connections: (Knex | null)[]
  rarity: Rarity
  historical: Rarity
  questionConditions: { [key: string]: string[] }
  rarityPercents: RarityPercents
  distanceUnit: 'km' | 'mi'
  reactMapDb: null | number
  filterContext: {
    Route: { maxDistance: number; maxDuration: number }
  }
}

export interface RarityPercents {
  common: number
  uncommon: number
  rare: number
  ultraRare: number
  regional: number
  never: number
  event: number
}

export type Rarity = { [key: string]: keyof RarityPercents }

export interface BaseRecord {
  id: number | string
  lat: number
  lon: number
  updated: number
  distance?: number
}

export interface GqlContext {
  req: Request
  res: Response
  Db: DbCheck
  Event: EventManager
  perms: Permissions
  user: string
  transaction: Transaction
  operation: 'query' | 'mutation'
}

export interface Permissions {
  map: boolean
  pokemon: boolean
  iv: boolean
  pvp: boolean
  gyms: boolean
  raids: boolean
  pokestops: boolean
  eventStops: boolean
  quests: boolean
  lures: boolean
  portals: boolean
  submissionCells: boolean
  invasions: boolean
  nests: boolean
  nestSubmissions: boolean
  scanAreas: boolean
  weather: boolean
  spawnpoints: boolean
  s2cells: boolean
  scanCells: boolean
  devices: boolean
  donor: boolean
  gymBadges: boolean
  backups: boolean
  routes: boolean
  scanner: string[]
  areaRestrictions: string[]
  webhooks: string[]
}

export type PickMatching<T, V> = {
  [K in keyof T as T[K] extends V ? K : never]: T[K]
}

export type ExtractMethods<T> = PickMatching<T, Function>

export type Head<T extends any[]> = T extends [...infer Head, any]
  ? Head
  : any[]

export interface Waypoint {
  lat_degrees: number
  lng_degrees: number
  elevation_in_meters: number
}

export interface Route {
  id: string
  name: string
  description: string
  distance_meters: number
  duration_seconds: number
  start_fort_id: string
  start_lat: number
  start_image: string
  end_fort_id: string
  end_lat: number
  start_lon: number
  end_lon: number
  end_image: string
  image: string
  image_border_color: string
  reversible: boolean
  tags: string[]
  type: number
  updated: number
  version: number
  waypoints: Waypoint[]
}
