import { LEAGUES } from './services/filters/pokemon/constants'

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

export type CleanPvp = { [league in typeof LEAGUES[number]]?: PvpEntry }
