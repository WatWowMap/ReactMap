// server/src/services/rules-to-golbat-filters.ts
//
// Pure translation from ReactMap's rules model
// (docs/superpowers/specs/2026-08-24-reactmap-2-0-rules-model-design.md) to
// Golbat's DNF filter vocabulary (decoder/api_pokemon_scan_v3.go,
// decoder/api_fort.go, /Users/rin/GitHub/Golbat). No network, no database --
// callers pass in rule rows already joined the way the spec's tables read
// (a category table's row merged with its parent `rule` row, plus any child
// rows -- `exclusions` on a pokemon rule, `conditions` on a pokestop rule --
// as arrays). `golbat-requests.js` (Task 2) builds the actual HTTP bodies
// from what this module returns; this module never calls it.
//
// Every function returns `{ upstream, local }`:
//   - `upstream` is what Golbat can be asked, in the shape
//     `buildPokemonScanBody`/`buildFortScanBody` expect for their
//     `filters`/`gyms`/`pokestops`/`stations` arguments. `null` means "do
//     not call this endpoint at all" -- see the no-rules handling below,
//     which exists specifically so a caller never has to guess whether an
//     empty-looking request means "nothing matches" or "nothing was asked".
//   - `local` is a flat array of predicate descriptors Task 4 evaluates
//     against Golbat's response. Never executable functions -- these need
//     to survive being logged and unit tested without a live entity to
//     call them on.
//
// Four correctness traps, cited against Golbat source, drive most of the
// shape here:
//
//   1. decoder/api_pokemon_common.go:130-146 -- an empty/omitted `filters`
//      array on the pokemon scan matches NOTHING. A user with zero pokemon
//      rules must not have this module hand back `{ filters: [] }`, which
//      is indistinguishable from "the caller forgot to populate this" and
//      would silently poll for nothing forever. `translatePokemonRules([])`
//      returns `upstream: null` instead, so the caller can and should skip
//      the request entirely.
//
//   2. decoder/api_fort.go:53-59 -- omitting all three fort groups
//      (`gyms`/`pokestops`/`stations`) is a documented "legacy bare-probe"
//      that matches every fort of every type, while omitting just one
//      excludes that type. So a gym-only user must send a `pokestops`/
//      `stations` of `null` deliberately (that's the normal, safe way to
//      exclude a type) -- but a user with zero rules in ALL three
//      categories must not fall through to all-three-null, or the "no fort
//      rules" case silently becomes "match everything". `translateFortRules`
//      short-circuits to `upstream: null` (skip the request) in exactly
//      that case.
//
//   3. decoder/pokemonRtree.go calculatePokemonPvpLookup -- the pvp filter
//      tests one rank collapsed to the single best value across every
//      evolution and cap. A rule's minimum rank above 1 is widened to 1
//      upstream (over-inclusive is safe; the real bound moves to `local`),
//      and `pvp_target_species` -- which asks about one specific
//      evolution's rank, something Golbat's collapsed value can never
//      answer -- always produces a local predicate regardless of the
//      declared bounds. Only the minimum is widened: Golbat's collapsed
//      value is always <= the true rank for any single evolution, so a
//      declared max is never a source of false exclusions and is passed
//      through unchanged.
//
//   4. Several columns have no Golbat filter field at all and are always
//      local: `rule_exclusion` (DNF is OR-of-AND with no NOT),
//      `pvp_target_species` (see above), `rule_gym.ex_eligible` and
//      `in_battle` (present on the result, not filterable --
//      decoder/api_fort.go:72-104 has no such fields), `rule_gym.has_badge`
//      (ReactMap's own data, not Golbat's), `rule_pokestop.event_stop`'s
//      goldstop/kecleon rows and `rule_pokestop_condition` (no field), and
//      `rule_nest` entirely, because Golbat exposes no nest scan endpoint
//      at all (upstream-validation-corrections.md, "Golbat: three that
//      change the design").

/** Golbat's DNF range fields are int16; used as the open end of a one-sided range. */
const INT16_MAX = 32767

function toRange(
  min: number | null | undefined,
  max: number | null | undefined,
): { min: number; max: number } | null {
  if (min == null && max == null) return null
  // decoder/api_pokemon_scan_v3.go / api_fort.go MinMax doc: "An omitted
  // bound defaults to 0" for BOTH min and max, so a range with only one
  // bound set must still send the other explicitly -- omitting it does not
  // mean "unbounded", it means "match nothing above/below zero".
  return { min: min ?? 0, max: max ?? INT16_MAX }
}

/** ApiPokemonDnfId (decoder/api_pokemon_scan_v3.go): `{id, form}`. */
function toPokemonDnfId(speciesId: number, formId: number | null | undefined) {
  return { id: speciesId, form: formId ?? null }
}

/** ApiDnfId, the fort-side id pair (decoder/api_fort.go): `{pokemon_id, form}`. */
function toFortDnfId(speciesId: number, formId: number | null | undefined) {
  return { pokemon_id: speciesId, form: formId ?? null }
}

// ---------------------------------------------------------------------------
// Pokemon (rule_pokemon -> ApiPokemonDnfFilter3, POST /api/pokemon/v3/scan)
// ---------------------------------------------------------------------------

const PVP_LEAGUES = /** @type {const} */ (['little', 'great', 'ultra'])

function buildPokemonClause(rule: any): Record<string, any> {
  const clause: Record<string, any> = {
    // decoder/api_pokemon_scan_v3.go:31-32: "empty matches any pokemon".
    // species_id NULL is exactly that -- no entry at all, not a wildcard id.
    pokemon:
      rule.species_id != null
        ? [toPokemonDnfId(rule.species_id, rule.form_id)]
        : [],
  }

  const iv = toRange(rule.iv_min, rule.iv_max)
  if (iv) clause.iv = iv
  const atkIv = toRange(rule.atk_min, rule.atk_max)
  if (atkIv) clause.atk_iv = atkIv
  const defIv = toRange(rule.def_min, rule.def_max)
  if (defIv) clause.def_iv = defIv
  const staIv = toRange(rule.sta_min, rule.sta_max)
  if (staIv) clause.sta_iv = staIv
  const level = toRange(rule.level_min, rule.level_max)
  if (level) clause.level = level
  const cp = toRange(rule.cp_min, rule.cp_max)
  if (cp) clause.cp = cp
  if (rule.gender != null) clause.gender = [rule.gender]

  // xxs/xxl intentionally NOT translated here -- see the module header and
  // this task's report. Golbat's `size` filter is a numeric min/max range
  // (decoder/api_pokemon_scan_v3.go:40) and rule_pokemon stores two
  // booleans, which the corrections doc already flags as unable to express
  // a middle range. Inventing a threshold to bridge the two is a schema
  // decision, not a translation-layer one, so it is left out of both
  // `upstream` and `local` rather than guessed at.

  for (const league of PVP_LEAGUES) {
    const min = rule[`${league}_min`]
    const max = rule[`${league}_max`]
    if (min == null && max == null) continue
    const needsWidening =
      (min != null && min > 1) || rule.pvp_target_species != null
    clause[`pvp_${league}`] = {
      min: needsWidening ? 1 : (min ?? 0),
      max: max ?? INT16_MAX,
    }
  }

  return clause
}

function pokemonLocalPredicates(rule: any): Record<string, any>[] {
  const local: Record<string, any>[] = []

  for (const league of PVP_LEAGUES) {
    const min = rule[`${league}_min`]
    const max = rule[`${league}_max`]
    if (min == null && max == null) continue
    const needsLocalCheck =
      (min != null && min > 1) || rule.pvp_target_species != null
    if (!needsLocalCheck) continue
    local.push({
      type: 'pvp_rank',
      ruleId: rule.id,
      league,
      min: min ?? 1,
      max: max ?? Infinity,
      // decoder/pokemonRtree.go calculatePokemonPvpLookup collapses across
      // every evolution; a target species turns the collapsed upstream pass
      // into a real per-entry check against the response's
      // `pvp.<league>[]` array (pokemon/form/cap/evolution/rank).
      targetSpeciesId: rule.pvp_target_species ?? null,
    })
  }

  if (rule.xxs || rule.xxl) {
    local.push({
      type: 'size_unsupported',
      ruleId: rule.id,
      xxs: Boolean(rule.xxs),
      xxl: Boolean(rule.xxl),
    })
  }

  for (const exclusion of rule.exclusions ?? []) {
    local.push({
      type: 'exclusion',
      ruleId: rule.id,
      speciesId: exclusion.species_id,
      formId: exclusion.form_id ?? null,
    })
  }

  return local
}

/**
 * @param rules `rule` rows joined with `rule_pokemon` (and, for any
 *   rule whose own species is NULL, its `rule_exclusion` rows as `exclusions`).
 */
function translatePokemonRules(rules: any[] | undefined): {
  upstream: { filters: Record<string, any>[] } | null
  local: Record<string, any>[]
} {
  if (!rules || rules.length === 0) {
    // Trap 1: do not hand back `{ filters: [] }` -- that's Golbat's own
    // "matches nothing" shape, indistinguishable from a caller bug. `null`
    // tells the caller to skip the pokemon scan entirely.
    return { upstream: null, local: [] }
  }

  const filters: Record<string, any>[] = []
  const local: Record<string, any>[] = []
  for (const rule of rules) {
    filters.push(buildPokemonClause(rule))
    local.push(...pokemonLocalPredicates(rule))
  }
  return { upstream: { filters }, local }
}

// ---------------------------------------------------------------------------
// Forts (rule_gym / rule_pokestop / rule_station -> ApiFortDnfFilter,
// POST /api/fort/scan)
// ---------------------------------------------------------------------------

function buildGymClause(rule: any): Record<string, any> {
  const clause: Record<string, any> = {}
  if (rule.raid_level != null) clause.raid_level = [rule.raid_level]
  if (rule.boss_species != null) {
    clause.raid_pokemon_id = [toFortDnfId(rule.boss_species, rule.boss_form)]
  }
  if (rule.team != null) clause.team_id = [rule.team]
  const slots = toRange(rule.slots_min, rule.slots_max)
  if (slots) clause.available_slots = slots
  if (rule.ar_eligible != null) {
    clause.is_ar_scan_eligible = Boolean(rule.ar_eligible)
  }
  // No `raid_temp_evolution_id` (mega/primal) translation: rule_gym has no
  // column for it yet (open question in the rules spec). If one is added,
  // it slots in here as `clause.raid_temp_evolution_id = [rule.mega_id]`,
  // upstream like raid_level -- Golbat already supports the field.
  return clause
}

function gymLocalPredicates(rule: any): Record<string, any>[] {
  const local: Record<string, any>[] = []
  // No Golbat field for any of these three (decoder/api_fort.go:72-104 has
  // no ex-eligible or in-battle filter, and has_badge is ReactMap's own
  // gym-favoriting data, never Golbat's).
  if (rule.ex_eligible != null) {
    local.push({
      type: 'ex_eligible',
      ruleId: rule.id,
      value: Boolean(rule.ex_eligible),
    })
  }
  if (rule.in_battle != null) {
    local.push({
      type: 'in_battle',
      ruleId: rule.id,
      value: Boolean(rule.in_battle),
    })
  }
  if (rule.has_badge != null) {
    local.push({
      type: 'has_badge',
      ruleId: rule.id,
      value: Boolean(rule.has_badge),
    })
  }
  return local
}

function buildPokestopClause(rule: any): Record<string, any> {
  const clause: Record<string, any> = {}
  switch (rule.role) {
    case 'quest': {
      if (rule.reward_type != null)
        clause.quest_reward_type = [rule.reward_type]
      if (rule.item_id != null) clause.quest_reward_item_id = [rule.item_id]
      if (rule.reward_species != null) {
        clause.quest_reward_pokemon = [
          toFortDnfId(rule.reward_species, rule.reward_form),
        ]
      }
      const amount = toRange(rule.amount_min, rule.amount_max)
      if (amount) clause.quest_reward_amount = amount
      break
    }
    case 'invasion': {
      if (rule.invasion_character_id != null) {
        clause.incident_character = [rule.invasion_character_id]
      }
      // No `incident_display_type` translation: rule_pokestop only stores
      // the character id today (the rules spec's own open question notes
      // this may need a display-type companion). If one is added, it slots
      // in here as `clause.incident_display_type = [rule.display_type]`.
      break
    }
    case 'lure': {
      if (rule.lure_id != null) clause.lure_id = [rule.lure_id]
      break
    }
    case 'event_stop':
      // event_display_type (goldstop/kecleon/showcase) has no upstream
      // field to narrow by -- see pokestopLocalPredicates. The clause is
      // deliberately left with no conditions, which Golbat reads as
      // match-all-pokestops for this OR branch (every field nil/omitted --
      // decoder/api_fort.go's ApiFortDnfFilter doc: a condition applies
      // only when present). That is intentional and necessary, not an
      // oversight: since Golbat cannot narrow event stops at all, the only
      // way to find them is to fetch broadly and filter locally.
      break
    default:
      break
  }
  return clause
}

function pokestopLocalPredicates(rule: any): Record<string, any>[] {
  const local: Record<string, any>[] = []
  if (rule.role === 'event_stop' && rule.event_display_type != null) {
    local.push({
      type: 'event_display_type',
      ruleId: rule.id,
      value: rule.event_display_type,
    })
  }
  // rule_pokestop_condition: no Golbat field exists for quest condition
  // title/target at all.
  for (const condition of rule.conditions ?? []) {
    local.push({
      type: 'quest_condition',
      ruleId: rule.id,
      title: condition.title,
      target: condition.target,
    })
  }
  return local
}

function buildStationClause(rule: any): Record<string, any> {
  const clause: Record<string, any> = {}
  if (rule.battle_level != null) clause.battle_level = [rule.battle_level]
  if (rule.boss_species != null) {
    clause.battle_pokemon = [toFortDnfId(rule.boss_species, rule.boss_form)]
  }
  if (rule.gmax_stationed != null) {
    clause.stationed_gmax = Boolean(rule.gmax_stationed)
  }
  // include_inactive defaults to false, meaning "station_active is
  // otherwise implied" per the rules spec -- so the common case (false)
  // narrows upstream to active-only, and true drops the constraint rather
  // than asking for inactive-only.
  if (!rule.include_inactive) clause.station_active = true
  return clause
}

function buildFortGroup(
  rules: any[],
  clauseBuilder: (rule: any) => Record<string, any>,
  localBuilder: (rule: any) => Record<string, any>[],
): {
  group: { filters: Record<string, any>[] } | null
  local: Record<string, any>[]
} {
  if (!rules || rules.length === 0) return { group: null, local: [] }
  const filters: Record<string, any>[] = []
  const local: Record<string, any>[] = []
  for (const rule of rules) {
    filters.push(clauseBuilder(rule))
    local.push(...localBuilder(rule))
  }
  return { group: { filters }, local }
}

function translateFortRules({
  gym = [],
  pokestop = [],
  station = [],
}: {
  gym?: any[]
  pokestop?: any[]
  station?: any[]
} = {}): {
  upstream: {
    gyms: { filters: Record<string, any>[] } | null
    pokestops: { filters: Record<string, any>[] } | null
    stations: { filters: Record<string, any>[] } | null
  } | null
  local: Record<string, any>[]
} {
  const gymResult = buildFortGroup(gym, buildGymClause, gymLocalPredicates)
  const pokestopResult = buildFortGroup(
    pokestop,
    buildPokestopClause,
    pokestopLocalPredicates,
  )
  const stationResult = buildFortGroup(station, buildStationClause, () => [])

  if (!gymResult.group && !pokestopResult.group && !stationResult.group) {
    // Trap 2: all three groups omitted is Golbat's documented bare-probe
    // (decoder/api_fort.go:53-59) and matches every fort of every type. A
    // user tracking no forts at all must not fall through to that --
    // `null` tells the caller to skip the fort scan entirely, the fort
    // equivalent of trap 1's pokemon handling.
    return { upstream: null, local: [] }
  }

  return {
    upstream: {
      gyms: gymResult.group,
      pokestops: pokestopResult.group,
      stations: stationResult.group,
    },
    local: [
      ...gymResult.local,
      ...pokestopResult.local,
      ...stationResult.local,
    ],
  }
}

// ---------------------------------------------------------------------------
// Nests (rule_nest -- entirely local; Golbat has no nest scan endpoint)
// ---------------------------------------------------------------------------

/**
 * Golbat ships a `nests` table (`pokemon_id`/`pokemon_form`/`pokemon_avg`)
 * but exposes no HTTP endpoint for it at all
 * (upstream-validation-corrections.md, "Golbat: three that change the
 * design" -- "Golbat has no nest data" is true of the API and false of the
 * schema). There is nothing to send Golbat, so `upstream` is always `null`;
 * every rule becomes a local predicate over whatever populates nest data
 * (a direct SQL read, per the rules spec's evaluation model).
 *
 * @param rules `rule` rows joined with `rule_nest`.
 */
function translateNestRules(rules: any[]): {
  upstream: null
  local: Record<string, any>[]
} {
  if (!rules || rules.length === 0) return { upstream: null, local: [] }
  const local = rules.map((rule) => ({
    type: 'nest',
    ruleId: rule.id,
    speciesId: rule.species_id ?? null,
    formId: rule.form_id ?? null,
    avgMin: rule.avg_min ?? null,
    avgMax: rule.avg_max ?? null,
  }))
  return { upstream: null, local }
}

export {
  buildGymClause,
  // Exported for tests -- these are the individual clause builders the
  // functions above compose, and asserting on them directly documents each
  // column's mapping without going through a whole-rule fixture.
  buildPokemonClause,
  buildPokestopClause,
  buildStationClause,
  translateFortRules,
  translateNestRules,
  translatePokemonRules,
}
