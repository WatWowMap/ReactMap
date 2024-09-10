import type {
  ScannerModels,
  ScannerModelKeys,
  RmModels,
  RmModelKeys,
  ModelKeys,
  Station,
  Backup,
  Nest,
  NestSubmission,
  Pokestop,
  Gym,
  Pokemon,
} from 'server/src/models'
import { Knex } from 'knex'
import { Model } from 'objection'
import { NextFunction, Request, Response } from 'express'
import { VerifyCallback } from 'passport-oauth2'

import type { DbManager } from 'server/src/services/DbManager'
import type { EventManager } from 'server/src/services/EventManager'
import { ModelReturn, OnlyType } from './utility'
import { Profile } from 'passport-discord'
import { User } from './models'
import { Config } from '@rm/types'
import { OperationTypeNode } from 'graphql'

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
  hasShowcaseData: boolean
  hasShowcaseForm: boolean
  hasShowcaseType: boolean
}

export interface ExpressUser extends User {
  perms: Permissions
  valid: boolean
  avatar: string
  webhookStrategy?: Strategy
  rmStrategy: string
}

export interface AvailablePokemon {
  id: number
  form: number
  count: number
}

export interface Available {
  pokemon: ModelReturn<typeof Pokemon, 'getAvailable'>
  gyms: ModelReturn<typeof Gym, 'getAvailable'>
  pokestops: ModelReturn<typeof Pokestop, 'getAvailable'>
  nests: ModelReturn<typeof Nest, 'getAvailable'>
  stations: ModelReturn<typeof Station, 'getAvailable'>
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

export interface DbManagerClass {
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
  questConditions: { [key: string]: string[] }
  rarityPercents: RarityPercents
  reactMapDb: null | number
  filterContext: {
    Route: { maxDistance: number; maxDuration: number }
    Pokestop: { hasConfirmedInvasions: boolean }
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
  userId: number
  req: Request
  res: Response
  Db: DbManager
  Event: EventManager
  perms: Permissions
  username: string
  operation: OperationTypeNode
  startTime?: number
}

type BasePerms = { [K in keyof Config['authentication']['perms']]: boolean }

export interface Permissions extends BasePerms {
  blockedGuildNames: string[]
  scanner: string[]
  areaRestrictions: string[]
  webhooks: string[]
  trial: boolean
}

export interface FilterId {
  id: number
  form?: number
}
export interface DnfMinMax {
  min: number
  max: number
}

export interface DnfFilter {
  pokemon?: FilterId | FilterId[]
  iv?: DnfMinMax
  level?: DnfMinMax
  cp?: DnfMinMax
  atk_iv?: DnfMinMax
  def_iv?: DnfMinMax
  sta_iv?: DnfMinMax
  gender?: DnfMinMax
  size?: DnfMinMax
  pvp_little?: DnfMinMax
  pvp_great?: DnfMinMax
  pvp_ultra?: DnfMinMax
}

export type DiscordVerifyFunction = (
  req: Request,
  accessToken: string,
  refreshToken: string,
  profile: Profile,
  done: VerifyCallback,
) => void

export type BaseFilter = import('server/src/filters/Base').BaseFilter

export type PokemonFilter =
  import('server/src/filters/pokemon/Frontend').PokemonFilter

export type AllFilters = ReturnType<
  (typeof import('server/src/filters/builder/base'))['buildDefaultFilters']
>

export type Categories = keyof AllFilters

export type AdvCategories =
  | 'pokemon'
  | 'gyms'
  | 'pokestops'
  | 'nests'
  | 'stations'

export type UIObject = ReturnType<
  (typeof import('server/src/ui/drawer'))['drawer']
>

export interface PokemonGlow
  extends Partial<Omit<Config['clientSideOptions']['pokemon'], 'glow'>> {
  glow: boolean
  Hundo?: string
  Nundo?: string
  'Top PVP Rank'?: string
  Multiple?: string
}
export interface ClientOptions
  extends Partial<Omit<Config['clientSideOptions'], 'pokemon'>> {
  pokemon: PokemonGlow
}

export type ExpressMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => any

export type ExpressErrorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => any

export interface StateReportObj {
  database: boolean
  pvp: boolean
  icons: boolean
  audio: boolean
  historical: boolean
  masterfile: boolean
  invasions: boolean
  webhooks: boolean
  events: boolean
  strategies: boolean
}
