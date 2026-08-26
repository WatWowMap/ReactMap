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

/**
 * Every optional filter Poracle's v2 API carries is a pointer on its side,
 * projected to JSON `null` when the rule is at that filter's documented
 * wildcard -- never the stored sentinel itself (`pokemonRowToRule`,
 * PoracleNG's `v2_pokemon.go`). "Unset" and "set to the sentinel value" are
 * not events that can happen on the wire, so a column that can be unset is
 * typed `number | null` here, matching how `Rule`'s own nullable columns
 * (`app/rules/rule-types.ts`) already mean the same thing. `gender` is a
 * nullable *string* enum on the wire (`"male" | "female" | "genderless"`,
 * `null` for "any"), not a number -- Poracle stores it as an int but its v2
 * response translates it back to the enum's words before sending it.
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
  ivMin: number | null
  ivMax: number | null
  cpMin: number | null
  cpMax: number | null
  levelMin: number | null
  levelMax: number | null
  atkMin: number | null
  atkMax: number | null
  defMin: number | null
  defMax: number | null
  staMin: number | null
  staMax: number | null
  gender: string | null
  weightMin: number | null
  weightMax: number | null
  minTime: number | null
  rarityMin: number | null
  rarityMax: number | null
  sizeMin: number | null
  sizeMax: number | null
  pvpLeague: number | null
  pvpRankBest: number | null
  pvpRankWorst: number | null
  pvpMinCp: number | null
  pvpCap: number | null
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

/**
 * One Poracle rule, projected to the shape a client sees.
 *
 * `profileNo` is 0 for a rule Poracle did not stamp one onto. Poracle stamps
 * it only in the snapshot's `all_profiles` mode, which is the mode this router
 * reads in, so every rule a client sees carries a real one. A write response
 * carries none -- and nothing built from a write response is handed to a
 * client, precisely because Poracle's create cannot name the rules it made.
 */
export function toAlertRow(row: any): AlertRow {
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
    ivMin: nullableNum(row?.min_iv),
    ivMax: nullableNum(row?.max_iv),
    cpMin: nullableNum(row?.min_cp),
    cpMax: nullableNum(row?.max_cp),
    levelMin: nullableNum(row?.min_level),
    levelMax: nullableNum(row?.max_level),
    atkMin: nullableNum(row?.atk),
    atkMax: nullableNum(row?.max_atk),
    defMin: nullableNum(row?.def),
    defMax: nullableNum(row?.max_def),
    staMin: nullableNum(row?.sta),
    staMax: nullableNum(row?.max_sta),
    gender: nullableStr(row?.gender),
    weightMin: nullableNum(row?.min_weight),
    weightMax: nullableNum(row?.max_weight),
    minTime: nullableNum(row?.min_time),
    rarityMin: nullableNum(row?.rarity),
    rarityMax: nullableNum(row?.max_rarity),
    sizeMin: nullableNum(row?.size),
    sizeMax: nullableNum(row?.max_size),
    pvpLeague: nullableNum(row?.pvp_ranking_league),
    pvpRankBest: nullableNum(row?.pvp_ranking_best),
    pvpRankWorst: nullableNum(row?.pvp_ranking_worst),
    pvpMinCp: nullableNum(row?.pvp_ranking_min_cp),
    pvpCap: nullableNum(row?.pvp_ranking_cap),
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
    alerts: asArray(body?.tracking?.pokemon).map((row) => toAlertRow(row)),
    profiles: asArray(body?.profiles).map(toProfileView),
    // Poracle's container is `{ default?, named[] }` -- reading `locations`
    // off it yields an empty list against a live Poracle while passing any
    // fixture that invented the key. The default location is the human's own
    // latitude/longitude, which `HumanView` already carries.
    locations: asArray(body?.locations?.named).map(toLocationView),
  }
}
