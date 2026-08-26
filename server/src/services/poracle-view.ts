// server/src/services/poracle-view.ts

/**
 * Everything a client sees of Poracle is constructed here, field by field.
 *
 * 1.x handed raw Poracle bodies back from two paths and leaked nothing only
 * because the GraphQL schema declared no matching fields, so Apollo dropped
 * them on the way out. That was the transport pruning a response, not an
 * authorization check. tRPC returns whatever a procedure returns, so the same
 * shape ported forward would be an allow-by-default over a human record that
 * carries admin_disable, blocked_alerts and community_membership.
 *
 * The rule that follows: every object below is built from explicit literals.
 * No spread of a Poracle object, no Object.assign onto one, no source row with
 * a few fields deleted.
 */

export interface AlertRow {
  uid: number
  profileNo: number
  pokemonId: number
  form: number
  costume: number
  ping: string
  clean: boolean
  distance: number
  template: string
  overrideLocationLabel: string | null
  ivMin: number
  ivMax: number
  cpMin: number
  cpMax: number
  levelMin: number
  levelMax: number
  atkMin: number
  atkMax: number
  defMin: number
  defMax: number
  staMin: number
  staMax: number
  gender: number
  weightMin: number
  weightMax: number
  minTime: number
  rarityMin: number
  rarityMax: number
  sizeMin: number
  sizeMax: number
  pvpLeague: number
  pvpRankBest: number
  pvpRankWorst: number
  pvpMinCp: number
  pvpCap: number
  description: string | null
}

export interface HumanView {
  enabled: boolean
  currentProfileNo: number
  latitude: number | null
  longitude: number | null
  areas: string[]
}

export interface ProfileView {
  profileNo: number
  name: string
}

export interface LocationView {
  label: string
  latitude: number
  longitude: number
}

export interface AlertsSnapshot {
  human: HumanView
  alerts: AlertRow[]
  profiles: ProfileView[]
  locations: LocationView[]
}

function num(value: any): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function nullableNum(value: any): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function str(value: any): string {
  return typeof value === 'string' ? value : ''
}

function nullableStr(value: any): string | null {
  return typeof value === 'string' ? value : null
}

function bool(value: any): boolean {
  return value === true || value === 1
}

/**
 * Poracle stores the human's areas as a JSON-encoded array in a text column.
 * A malformed value yields no areas rather than throwing: 1.x read a field off
 * a possibly-undefined human and threw, which is how a dead Poracle became an
 * empty tab with dead buttons.
 */
function parseAreas(value: any): string[] {
  if (Array.isArray(value)) return value.filter((a) => typeof a === 'string')
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((a) => typeof a === 'string')
      : []
  } catch {
    return []
  }
}

function toHumanView(human: any): HumanView {
  return {
    enabled: bool(human?.enabled),
    currentProfileNo: num(human?.current_profile_no),
    latitude: nullableNum(human?.latitude),
    longitude: nullableNum(human?.longitude),
    areas: parseAreas(human?.area),
  }
}

function toAlertRow(row: any): AlertRow {
  return {
    uid: num(row?.uid),
    profileNo: num(row?.profile_no),
    pokemonId: num(row?.pokemon_id),
    form: num(row?.form),
    costume: num(row?.costume),
    ping: str(row?.ping),
    clean: bool(row?.clean),
    distance: num(row?.distance),
    template: str(row?.template),
    overrideLocationLabel: nullableStr(row?.override_location_label),
    ivMin: num(row?.min_iv),
    ivMax: num(row?.max_iv),
    cpMin: num(row?.min_cp),
    cpMax: num(row?.max_cp),
    levelMin: num(row?.min_level),
    levelMax: num(row?.max_level),
    atkMin: num(row?.atk),
    atkMax: num(row?.max_atk),
    defMin: num(row?.def),
    defMax: num(row?.max_def),
    staMin: num(row?.sta),
    staMax: num(row?.max_sta),
    gender: num(row?.gender),
    weightMin: num(row?.min_weight),
    weightMax: num(row?.max_weight),
    minTime: num(row?.min_time),
    rarityMin: num(row?.rarity),
    rarityMax: num(row?.max_rarity),
    sizeMin: num(row?.size),
    sizeMax: num(row?.max_size),
    pvpLeague: num(row?.pvp_ranking_league),
    pvpRankBest: num(row?.pvp_ranking_best),
    pvpRankWorst: num(row?.pvp_ranking_worst),
    pvpMinCp: num(row?.pvp_ranking_min_cp),
    pvpCap: num(row?.pvp_ranking_cap),
    description: nullableStr(row?.description),
  }
}

function toProfileView(profile: any): ProfileView {
  return {
    profileNo: num(profile?.profile_no),
    name: str(profile?.name),
  }
}

function toLocationView(location: any): LocationView {
  return {
    label: str(location?.label),
    latitude: num(location?.latitude),
    longitude: num(location?.longitude),
  }
}

function asArray(value: any): any[] {
  return Array.isArray(value) ? value : []
}

/**
 * Poracle's snapshot response, reduced to what the Alerts tab renders.
 *
 * Only the pokemon tracking type crosses the boundary. Poracle sends raid,
 * egg, quest, invasion and gym alongside it; a later plan adds those, and
 * reading the whole map today would ship them before anything is ready to.
 */
export function toAlertsSnapshot(body: any): AlertsSnapshot {
  return {
    human: toHumanView(body?.human),
    alerts: asArray(body?.tracking?.pokemon).map(toAlertRow),
    profiles: asArray(body?.profiles).map(toProfileView),
    locations: asArray(body?.locations?.locations).map(toLocationView),
  }
}
