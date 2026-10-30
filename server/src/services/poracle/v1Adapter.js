// @ts-check

/**
 * Adapter between PoracleNG v2 rules and the v1 rows older Poracle servers
 * speak. A v2 rule uses `null` for "any", named enums and separate
 * `clean` / `edit` / `summary` booleans; a v1 row uses integer sentinels
 * (9000, -1, 4096, ...), integer enums and a packed `clean` bitmask.
 *
 * `toV1Row` and `fromV1Row` are inverses for every supported field, and both
 * are pure.
 */

const TEAMS = /** @type {const} */ ([
  'harmony',
  'mystic',
  'valor',
  'instinct',
  'any',
])
const GENDERS = /** @type {const} */ (['any', 'male', 'female', 'genderless'])
const RSVP_CHANGES = /** @type {const} */ (['none', 'rsvp', 'rsvp_only'])

/** v2 incident `display_type` ⇄ v1 invasion `grunt_type`. */
const EVENT_NAMES = /** @type {Record<number, string>} */ ({
  7: 'gold-stop',
  8: 'kecleon',
  9: 'showcase',
})
const EVENT_DISPLAY_TYPES = Object.fromEntries(
  Object.entries(EVENT_NAMES).map(([id, name]) => [name, +id]),
)

const RAID_LEVEL_ANY = 90
const ANY_ID = 9000

/**
 * `any` is the v1 sentinel that maps to `null` in v2. A `required` field has
 * no wildcard in v2, so its value is kept as is.
 * @typedef {{ kind: 'int', any?: number, required?: boolean }
 *   | { kind: 'enum', values: readonly string[], any: number, required?: boolean }
 *   | { kind: 'bool' }
 *   | { kind: 'string', empty: string | null }
 *   | { kind: 'list' }} FieldSpec
 */

/** @type {Record<string, FieldSpec>} */
const COMMON_FIELDS = {
  distance: { kind: 'int', any: 0 },
  template: { kind: 'string', empty: '' },
  ping: { kind: 'string', empty: '' },
  override_location_label: { kind: 'string', empty: '' },
  override_areas: { kind: 'list' },
}

/** @type {Record<string, Record<string, FieldSpec>>} */
const FIELDS = {
  pokemon: {
    pokemon_id: { kind: 'int', any: 0 },
    form: { kind: 'int', any: 0 },
    costume: { kind: 'int', any: ANY_ID },
    min_iv: { kind: 'int', any: -1 },
    max_iv: { kind: 'int', any: 100 },
    min_cp: { kind: 'int', any: 0 },
    max_cp: { kind: 'int', any: 9000 },
    min_level: { kind: 'int', any: 0 },
    max_level: { kind: 'int', any: 55 },
    atk: { kind: 'int', any: 0 },
    def: { kind: 'int', any: 0 },
    sta: { kind: 'int', any: 0 },
    max_atk: { kind: 'int', any: 15 },
    max_def: { kind: 'int', any: 15 },
    max_sta: { kind: 'int', any: 15 },
    gender: { kind: 'enum', values: GENDERS, any: 0 },
    rarity: { kind: 'int', any: -1 },
    max_rarity: { kind: 'int', any: 6 },
    size: { kind: 'int', any: -1 },
    max_size: { kind: 'int', any: 5 },
    min_weight: { kind: 'int', any: 0 },
    max_weight: { kind: 'int', any: 9000000 },
    min_time: { kind: 'int', any: 0 },
    pvp_ranking_league: { kind: 'int', any: 0 },
    pvp_ranking_best: { kind: 'int', any: 1 },
    pvp_ranking_worst: { kind: 'int', any: 4096 },
    pvp_ranking_min_cp: { kind: 'int', any: 0 },
    pvp_ranking_cap: { kind: 'int', any: 0 },
    pvp_ranking_evolution: { kind: 'int', any: 0 },
  },
  // raid pokemon_id and level are derived from each other; see raidToV1.
  raid: {
    form: { kind: 'int', any: 0 },
    costume: { kind: 'int', any: ANY_ID },
    move: { kind: 'int', any: ANY_ID },
    evolution: { kind: 'int', any: ANY_ID },
    team: { kind: 'enum', values: TEAMS, any: 4 },
    exclusive: { kind: 'bool' },
    gym_id: { kind: 'string', empty: null },
    rsvp_changes: { kind: 'enum', values: RSVP_CHANGES, any: 0 },
  },
  egg: {
    level: { kind: 'int', any: RAID_LEVEL_ANY, required: true },
    team: { kind: 'enum', values: TEAMS, any: 4 },
    exclusive: { kind: 'bool' },
    gym_id: { kind: 'string', empty: null },
    rsvp_changes: { kind: 'enum', values: RSVP_CHANGES, any: 0 },
  },
  gym: {
    team: { kind: 'enum', values: TEAMS, any: 4, required: true },
    slot_changes: { kind: 'bool' },
    battle_changes: { kind: 'bool' },
    gym_id: { kind: 'string', empty: null },
  },
  quest: {
    reward_type: { kind: 'int', any: 0, required: true },
    reward: { kind: 'int', any: 0 },
    amount: { kind: 'int', any: 0 },
    form: { kind: 'int', any: 0 },
    shiny: { kind: 'bool' },
  },
  lure: {
    lure_id: { kind: 'int', any: 0, required: true },
  },
  nest: {
    pokemon_id: { kind: 'int', any: 0 },
    form: { kind: 'int', any: 0 },
    min_spawn_avg: { kind: 'int', any: 0 },
  },
  invasion: {
    grunt_type: { kind: 'string', empty: 'everything' },
    gender: { kind: 'enum', values: GENDERS.slice(0, 3), any: 0 },
  },
  // v1 has no incident type; see incidentToV1.
  incident: {},
}

/**
 * Thrown when a v2 rule can't be expressed on a v1 server.
 */
class UnsupportedOnV1 extends Error {
  /**
   * @param {string} field
   * @param {string} category
   */
  constructor(field, category) {
    super(`This Poracle server doesn't support ${field} on ${category} rules.`)
    this.name = 'UnsupportedOnV1'
    this.field = field
    this.category = category
  }
}

/**
 * @param {string} category
 * @returns {string}
 */
const v1Category = (category) =>
  category === 'incident' ? 'invasion' : category

/**
 * @param {Record<string, any>} row
 * @returns {boolean}
 */
const isIncidentRow = (row) =>
  typeof row?.grunt_type === 'string' && row.grunt_type in EVENT_DISPLAY_TYPES

/**
 * @param {number} value
 * @param {1 | 2 | 4} bit
 */
const hasBit = (value, bit) => Math.floor(value / bit) % 2 === 1

/**
 * @param {unknown} value
 * @returns {number | undefined}
 */
function toInt(value) {
  if (value === null || value === undefined || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : undefined
}

/**
 * @param {unknown} value 0/1/true/false, or a numeric string
 * @returns {boolean}
 */
const toBool = (value) => value === true || (!!value && value !== '0')

/**
 * Copies `specs` fields from a v2 rule into a v1 row, replacing `null` and
 * missing values with the v1 sentinel.
 * @param {Record<string, any>} rule
 * @param {Record<string, FieldSpec>} specs
 * @param {Record<string, any>} out
 */
function copyToV1(rule, specs, out) {
  Object.entries(specs).forEach(([field, spec]) => {
    const value = rule[field]
    switch (spec.kind) {
      case 'int':
        out[field] = toInt(value) ?? spec.any ?? 0
        break
      case 'enum': {
        const index = spec.values.indexOf(value)
        out[field] = index === -1 ? spec.any : index
        break
      }
      case 'bool':
        out[field] = toBool(value) ? 1 : 0
        break
      case 'string':
        out[field] = value ?? spec.empty
        break
      case 'list':
        out[field] = value ?? null
        break
      default:
    }
  })
}

/**
 * Copies `specs` fields from a v1 row into a complete v2 rule, turning each
 * sentinel back into `null`.
 * @param {Record<string, any>} row
 * @param {Record<string, FieldSpec>} specs
 * @param {Record<string, any>} out
 */
function copyFromV1(row, specs, out) {
  Object.entries(specs).forEach(([field, spec]) => {
    const value = row[field]
    switch (spec.kind) {
      case 'int': {
        const n = toInt(value)
        out[field] =
          n === undefined || (!spec.required && n === spec.any) ? null : n
        break
      }
      case 'enum': {
        const n = toInt(value)
        out[field] =
          n === undefined || (!spec.required && n === spec.any)
            ? null
            : (spec.values[n] ?? null)
        break
      }
      case 'bool':
        out[field] = toBool(value)
        break
      case 'string':
        out[field] =
          value === undefined || value === null || value === spec.empty
            ? null
            : String(value)
        break
      case 'list':
        out[field] = Array.isArray(value) ? value : null
        break
      default:
    }
  })
}

/**
 * A raid names either a boss (`pokemon_id`, level unused) or a tier.
 * @param {Record<string, any>} rule
 * @param {Record<string, any>} out
 */
function raidToV1(rule, out) {
  const pokemonId = toInt(rule.pokemon_id)
  if (pokemonId) {
    out.pokemon_id = pokemonId
    out.level = ANY_ID
  } else {
    out.pokemon_id = ANY_ID
    out.level = toInt(rule.level) ?? RAID_LEVEL_ANY
  }
}

/**
 * @param {Record<string, any>} row
 * @param {Record<string, any>} out
 */
function raidFromV1(row, out) {
  const pokemonId = toInt(row.pokemon_id)
  const level = toInt(row.level)
  const isBoss =
    pokemonId !== undefined && pokemonId > 0 && pokemonId !== ANY_ID
  out.pokemon_id = isBoss ? pokemonId : null
  out.level =
    isBoss ||
    level === undefined ||
    level === ANY_ID ||
    level === RAID_LEVEL_ANY
      ? null
      : level
}

/**
 * @param {Record<string, any>} rule
 * @param {Record<string, any>} out
 */
function incidentToV1(rule, out) {
  const grunt = EVENT_NAMES[rule.display_type]
  if (!grunt) throw new UnsupportedOnV1('display_type', 'incident')
  out.grunt_type = grunt
  out.gender = 0
}

/**
 * Converts a v2 rule into the v1 row to post to `/api/tracking/{category}`.
 * Incident rules become invasion rows.
 * @param {string} category ReactMap category
 * @param {Record<string, any>} rule
 * @returns {Record<string, any>}
 */
function toV1Row(category, rule) {
  /** @type {Record<string, any>} */
  const row = {}
  if (rule.uid !== undefined) row.uid = rule.uid
  if (category === 'incident') incidentToV1(rule, row)
  else copyToV1(rule, FIELDS[category] || {}, row)
  if (category === 'raid') raidToV1(rule, row)
  copyToV1(rule, COMMON_FIELDS, row)
  row.clean =
    (rule.clean ? 1 : 0) + (rule.edit ? 2 : 0) + (rule.summary ? 4 : 0)
  return row
}

/**
 * Converts a v1 row into a complete v2 rule: every field of the category is
 * present, `null` where the row holds the sentinel.
 * @param {string} category ReactMap category (`incident` for event rows)
 * @param {Record<string, any>} row
 * @returns {Record<string, any>}
 */
function fromV1Row(category, row) {
  /** @type {Record<string, any>} */
  const rule = {}
  if (row.uid !== undefined) rule.uid = row.uid
  if (row.description !== undefined) rule.description = row.description
  if (category === 'incident') {
    rule.display_type = EVENT_DISPLAY_TYPES[row.grunt_type] ?? null
  } else {
    copyFromV1(row, FIELDS[category] || {}, rule)
  }
  if (category === 'raid') raidFromV1(row, rule)
  copyFromV1(row, COMMON_FIELDS, rule)
  const clean =
    toInt(typeof row.clean === 'boolean' ? +row.clean : row.clean) ?? 0
  rule.clean = hasBit(clean, 1)
  rule.edit = hasBit(clean, 2)
  rule.summary = hasBit(clean, 4)
  return rule
}

module.exports = {
  UnsupportedOnV1,
  v1Category,
  isIncidentRow,
  toV1Row,
  fromV1Row,
}
