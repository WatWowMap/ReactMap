// server/src/services/rule-local-filter.ts
//
// Closes the gap between Task 3 (rules-to-golbat-filters.js) and Task 4
// (delta-engine.js): turns a user's rule set into a matcher that answers,
// for one entity, WHICH of the rules matched it.
//
// The answer is a list of rule ids rather than a boolean because both
// callers need both halves of it. "Is this entity visible at all" is "is
// the list non-empty", which is the `localFilter` predicate `computeDelta`
// accepts; and the ids themselves ride out on the wire as an entity's
// `matched` array, so a client holding a pokemon that two overlapping
// rules both claim can decide for itself which one styles it, instead of
// racing the server for an answer only one of them can see.
//
// The combining semantics (see the task report for the full derivation):
//
//   An entity is matched by every rule that, taken as a whole -- its own
//   scope (species/form or boss/reward/etc.), its own numeric bounds, its
//   own exclusions, and its own PVP bounds -- matches the entity. Rules are
//   OR'd; a rule's own criteria are AND'd together. This mirrors the rules
//   model spec verbatim ("Does it show at all? Any matching rule makes it
//   visible" / "exclusions: rule local, so a rule simply does not match" /
//   "adding a rule can only ever add visibility").
//
// This module deliberately does NOT consume Task 3's flattened `local`
// array. That array loses which rule a descriptor came from once several
// rules are flattened together, and -- more importantly -- it only ever
// contains *residual* fields (exclusions, PVP corrections): fields Golbat's
// upstream clause could not enforce exactly. A sound "does rule R match this
// entity" check needs R's FULL criteria, not just its residual fields.
// Concretely: a rule set with a broad "IV 100 only" rule (no local
// predicates at all) and a separate "IV 90+, except Rattata" rule (an
// exclusion) would, if a rejected-by-exclusion Rattata's non-local fields
// were never re-checked, wrongly fall through to "shown, because the other
// rule has no local predicate to fail" -- even though that Rattata's IV is
// 95, not 100, so the other rule never actually matched it either. Treating
// "has no residual predicate" as "trivially passes" is unsound the moment
// more than one rule is in play, which is exactly the scenario this
// evaluator exists for. So this module re-derives the FULL per-rule match
// from the same rule rows Task 3 reads (`rules-to-golbat-filters.js`'s
// input), evaluated against the entity fields Golbat actually returns
// (decoder/api_pokemon_response.go, decoder/api_gym.go,
// decoder/api_pokestop.go, decoder/api_station.go, /Users/rin/GitHub/Golbat).
// Golbat's upstream DNF clause remains exactly what it was: a narrowing
// optimization that keeps the poll payload small. This module is what
// decides the truth.

import { enabledRules } from './rule-enabled'

const PVP_LEAGUES = /** @type {const} */ (['little', 'great', 'ultra'])

/**
 * A range check against a rule's own `_min`/`_max` pair. Unlike
 * `rules-to-golbat-filters.js`'s `toRange`, an unset bound here means
 * genuinely unbounded (not "defaults to 0"/"defaults to 32767") -- that
 * convention exists solely because Golbat's wire format has no "unbounded"
 * sentinel of its own. This is a local, non-serialized check, so there is no
 * such constraint.
 *
 */
function matchesRange(
  value: number | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
): boolean {
  if (min == null && max == null) return true
  if (value == null) return false // a declared bound that can't be verified never passes
  if (min != null && value < min) return false
  if (max != null && value > max) return false
  return true
}

function speciesFormMatches(
  ruleSpeciesId: number | null | undefined,
  ruleFormId: number | null | undefined,
  entitySpeciesId: number | null | undefined,
  entityFormId: number | null | undefined,
): boolean {
  if (ruleSpeciesId == null) return true // NULL means any species -- rule-model spec
  if (entitySpeciesId !== ruleSpeciesId) return false
  if (ruleFormId == null) return true
  return (entityFormId ?? null) === ruleFormId
}

function isExcluded(
  exclusions: any[] | undefined,
  entitySpeciesId: number | null | undefined,
  entityFormId: number | null | undefined,
): boolean {
  return (exclusions ?? []).some(
    (excl: any) =>
      excl.species_id === entitySpeciesId &&
      (excl.form_id == null || (entityFormId ?? null) === excl.form_id),
  )
}

/**
 * Tests one league's PVP bound against the entity's real `pvp.<league>[]`
 * array (`ApiPvpEntry`: `pokemon`, `form`, `cap`, `rank`, `evolution`,
 * decoder/api_pokemon_response.go), rather than Golbat's collapsed
 * best-across-everything value the upstream clause was widened against.
 *
 * `targetSpeciesId` narrows to one evolution's entries. Per gohbem
 * (`/Users/rin/go/pkg/mod/cache/download/github.com/!unown!hash/gohbem` v0.12.0,
 * `ohbem.go` `QueryPvPRank`): a regular (non-temp) evolution's ranking is
 * produced by a RECURSIVE call with that evolution's own species id, and
 * that recursive call's entries carry `Pokemon: <the evolved species id>`
 * -- not the original caught species, and not the `evolution` field (which
 * `ohbem.go:459` sets only for temp/mega evolutions, `entry.Evolution =
 * tempEvoId`). So "the evolution a PVP rank belongs to"
 * (rules-model-design.md, `pvp_target_species`) is tested against
 * `entry.pokemon`, matching what the entry itself represents.
 *
 */
function pvpRankMatches(
  entries: any[] | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
  targetSpeciesId: number | null | undefined,
): boolean {
  if (!entries || entries.length === 0) return false
  const candidates =
    targetSpeciesId != null
      ? entries.filter((entry) => entry.pokemon === targetSpeciesId)
      : entries
  return candidates.some((entry) => matchesRange(entry.rank, min, max))
}

// ---------------------------------------------------------------------------
// Pokemon
// ---------------------------------------------------------------------------

/**
 * Does one `rule_pokemon` row (joined with its `exclusions`, same shape
 * `translatePokemonRules` takes) fully match one Golbat pokemon entity.
 */
function pokemonRuleMatches(rule: any, entity: any): boolean {
  const speciesId = entity.pokemon_id
  const formId = entity.form ?? null

  if (!speciesFormMatches(rule.species_id, rule.form_id, speciesId, formId)) {
    return false
  }
  // Invariant (rules-model-design.md): exclusions are only meaningful when
  // the rule's own species is NULL -- guarded here too, defensively, even
  // though `speciesFormMatches` already made a species_id-set rule's
  // exclusions irrelevant (a rule naming one species has nothing to carve
  // out of).
  if (
    rule.species_id == null &&
    isExcluded(rule.exclusions, speciesId, formId)
  ) {
    return false
  }

  if (!matchesRange(entity.iv, rule.iv_min, rule.iv_max)) return false
  if (!matchesRange(entity.atk_iv, rule.atk_min, rule.atk_max)) return false
  if (!matchesRange(entity.def_iv, rule.def_min, rule.def_max)) return false
  if (!matchesRange(entity.sta_iv, rule.sta_min, rule.sta_max)) return false
  if (!matchesRange(entity.level, rule.level_min, rule.level_max)) {
    return false
  }
  if (!matchesRange(entity.cp, rule.cp_min, rule.cp_max)) return false
  if (rule.gender != null && entity.gender !== rule.gender) return false

  // Golbat already filtered on `size` upstream, and the entity carries the
  // value back (`app/map/translate.ts` reads `raw.size`), so checking it
  // again here is what keeps this predicate the same question the Golbat
  // clause asked -- the invariant every other range in this function holds.
  if (!matchesRange(entity.size, rule.size_min, rule.size_max)) return false

  for (const league of PVP_LEAGUES) {
    const min = rule[`${league}_min`]
    const max = rule[`${league}_max`]
    if (min == null && max == null) continue
    if (
      !pvpRankMatches(entity.pvp?.[league], min, max, rule.pvp_target_species)
    ) {
      return false
    }
  }

  return true
}

/**
 * The shape every category's matcher shares: ask each rule whether it
 * matches this entity, on its own terms, and collect the ids of the ones
 * that said yes.
 */
function buildMatcher(
  rules: any[],
  ruleMatches: (rule: any, entity: any) => boolean,
): (entity: any) => number[] {
  // A rule the user switched off matches nothing, so its id can never
  // reach an entity's `matched` array -- where it would still drive
  // appearance and the popup's explanation lines on the client.
  const list = enabledRules(rules)
  if (list.length === 0) return () => []
  return (entity) => {
    const matched: number[] = []
    for (const rule of list) {
      if (ruleMatches(rule, entity)) matched.push(rule.id)
    }
    return matched
  }
}

/**
 * @param rules Same shape `translatePokemonRules` takes: `rule`
 *   rows joined with `rule_pokemon`, plus `exclusions` on any rule whose own
 *   species is NULL.
 * @returns every rule id that matched, in the order the rules were given.
 *   Empty means the entity is not visible: filtering is subtractive from
 *   nothing rather than from everything, so a user with no rules has asked
 *   for nothing and is sent nothing. What makes a fresh account's map
 *   populated is the seeded Everything rule (auth/seed-profile.ts), not a
 *   special case here.
 */
function buildPokemonMatcher(rules: any[]): (entity: any) => number[] {
  return buildMatcher(rules, pokemonRuleMatches)
}

// ---------------------------------------------------------------------------
// Forts -- same OR-across-rules/AND-within-a-rule shape, applied to gym,
// pokestop and station entities. None of these categories have an
// exclusions concept in the schema (`rule_exclusion` is only wired up for
// pokemon rules in Task 3), but the same "a rule with no residual local
// predicate is not automatically a match" reasoning still applies to any
// field Golbat's clause didn't enforce exactly for a *specific* rule -- the
// concrete example is `ex_eligible`/`in_battle`, which are never sent
// upstream at all, so the full per-rule re-check is what these predicates
// do too.
// ---------------------------------------------------------------------------

function gymRuleMatches(rule: any, entity: any): boolean {
  // ex_eligible/in_battle: never sent upstream at all (decoder/api_fort.go
  // has no such filter fields), so this rule's clause matches on
  // raid_level/boss/team/slots/ar_eligible alone and these two are checked
  // here, in full, every time -- not left as a bare residual predicate.
  if (rule.raid_level != null && entity.raid_level !== rule.raid_level) {
    return false
  }
  if (
    rule.boss_species != null &&
    (entity.raid_pokemon_id !== rule.boss_species ||
      (rule.boss_form != null &&
        (entity.raid_pokemon_form ?? null) !== rule.boss_form))
  ) {
    return false
  }
  if (rule.team != null && entity.team_id !== rule.team) return false
  if (!matchesRange(entity.available_slots, rule.slots_min, rule.slots_max)) {
    return false
  }
  if (
    rule.ar_eligible != null &&
    Boolean(entity.ar_scan_eligible) !== Boolean(rule.ar_eligible)
  ) {
    return false
  }
  if (
    rule.ex_eligible != null &&
    Boolean(entity.ex_raid_eligible) !== Boolean(rule.ex_eligible)
  ) {
    return false
  }
  if (
    rule.in_battle != null &&
    Boolean(entity.in_battle) !== Boolean(rule.in_battle)
  ) {
    return false
  }
  // has_badge is ReactMap's own gym-favoriting data, never Golbat's
  // (rules-to-golbat-filters.js's own header comment). This evaluator has
  // no badges data source to check it against, so a rule that sets it is
  // left unimplemented here rather than guessed at -- same treatment Task 3
  // gave xxs/xxl. A caller with badge data available can wrap this
  // predicate's result with its own has_badge check.
  return true
}

/** @param rules `rule` rows joined with `rule_gym`. */
function buildGymMatcher(rules: any[]): (entity: any) => number[] {
  return buildMatcher(rules, gymRuleMatches)
}

function pokestopRuleMatches(rule: any, entity: any): boolean {
  switch (rule.role) {
    case 'quest': {
      if (
        rule.reward_type != null &&
        entity.quest_reward_type !== rule.reward_type
      ) {
        return false
      }
      if (rule.item_id != null && entity.quest_item_id !== rule.item_id) {
        return false
      }
      if (
        rule.reward_species != null &&
        (entity.quest_pokemon_id !== rule.reward_species ||
          (rule.reward_form != null &&
            (entity.quest_pokemon_form_id ?? null) !== rule.reward_form))
      ) {
        return false
      }
      if (
        !matchesRange(
          entity.quest_reward_amount,
          rule.amount_min,
          rule.amount_max,
        )
      ) {
        return false
      }
      for (const condition of rule.conditions ?? []) {
        const conditions = entity.quest_conditions ?? []
        const satisfied = conditions.some(
          (c: any) =>
            c.title === condition.title && c.target === condition.target,
        )
        if (!satisfied) return false
      }
      return true
    }
    case 'invasion': {
      const invasions = entity.invasions ?? []
      if (invasions.length === 0) return false
      return invasions.some((incident: any) => {
        if (
          rule.invasion_character_id != null &&
          incident.character !== rule.invasion_character_id
        ) {
          return false
        }
        return true
      })
    }
    case 'lure':
      return rule.lure_id == null || entity.lure_id === rule.lure_id
    case 'event_stop':
      return (
        rule.event_display_type == null ||
        (entity.invasions ?? []).some(
          (incident: any) => incident.display_type === rule.event_display_type,
        )
      )
    default:
      return false
  }
}

/**
 * @param rules `rule` rows joined with `rule_pokestop` (and, for
 *   quest rules, `conditions`).
 */
function buildPokestopMatcher(rules: any[]): (entity: any) => number[] {
  return buildMatcher(rules, pokestopRuleMatches)
}

function stationRuleMatches(rule: any, entity: any): boolean {
  if (rule.battle_level != null && entity.battle_level !== rule.battle_level) {
    return false
  }
  if (
    rule.boss_species != null &&
    (entity.battle_pokemon_id !== rule.boss_species ||
      (rule.boss_form != null &&
        (entity.battle_pokemon_form ?? null) !== rule.boss_form))
  ) {
    return false
  }
  if (
    rule.gmax_stationed != null &&
    Boolean(entity.stationed_gmax) !== Boolean(rule.gmax_stationed)
  ) {
    return false
  }
  if (!rule.include_inactive && entity.station_active !== true) return false
  return true
}

/** @param rules `rule` rows joined with `rule_station`. */
function buildStationMatcher(rules: any[]): (entity: any) => number[] {
  return buildMatcher(rules, stationRuleMatches)
}

/**
 * Convenience entry point: build all four category matchers from one
 * rules-by-category bundle, so a caller has one obvious call from rules to
 * a working matcher.
 */
function buildMatchers({
  pokemon = [],
  gym = [],
  pokestop = [],
  station = [],
}: {
  pokemon?: any[]
  gym?: any[]
  pokestop?: any[]
  station?: any[]
} = {}): {
  pokemon: (entity: any) => number[]
  gym: (entity: any) => number[]
  pokestop: (entity: any) => number[]
  station: (entity: any) => number[]
} {
  return {
    pokemon: buildPokemonMatcher(pokemon),
    gym: buildGymMatcher(gym),
    pokestop: buildPokestopMatcher(pokestop),
    station: buildStationMatcher(station),
  }
}

export {
  buildGymMatcher,
  buildMatchers,
  buildPokemonMatcher,
  buildPokestopMatcher,
  buildStationMatcher,
  gymRuleMatches,
  matchesRange,
  pokemonRuleMatches,
  pokestopRuleMatches,
  pvpRankMatches,
  stationRuleMatches,
}
