// server/src/services/rule-row.ts
//
// One small adapter, between the two vocabularies this branch already has
// and neither of which is worth changing.
//
// `rules-repo.ts` answers `StoredRule`: camelCase, one flat object per row,
// `exclusions` a bare list of species ids. That is what the `rules.*` tRPC
// procedures return, and what the client's rule editor reads and writes.
//
// `rules-to-golbat-filters.ts` and `rule-local-filter.ts` both read the
// database's own column names -- `species_id`, `iv_min`, `great_max` -- and
// an `exclusions` array of `{species_id, form_id}` rows, because both were
// written against the rules-model spec's tables rather than against a
// transport shape. Keeping them that way means every citation in their
// headers still points at something a reader can look up.
//
// So the conversion lives here rather than in either of them, and the
// subscription is its only caller.

import type { StoredRule } from './rules-repo'

/**
 * The PVP cap each `pvp_league` value names, keyed by the CP cap itself.
 * `rule_pokemon` stores one league and one rank range; the evaluators read
 * a `<league>_min`/`<league>_max` pair per league, because a rule set may
 * name a different league on every row.
 */
const LEAGUE_BY_CAP: Record<number, string> = {
  500: 'little',
  1500: 'great',
  2500: 'ultra',
}

/**
 * Turns one `StoredRule` into the joined row shape the two evaluators read.
 *
 * `sizeMin`/`sizeMax` are deliberately dropped: neither evaluator has an
 * xxs/xxl check to hand them to, for the reason Task 3 documents at
 * `buildPokemonClause` -- Golbat's `size` filter is a numeric range and the
 * rules table stores a pair of bounds whose mapping onto it is a schema
 * decision nothing has taken yet. Passing them through under a name nobody
 * reads would only look like they were being honoured.
 */
function toRuleRow(stored: StoredRule): Record<string, unknown> {
  const row: Record<string, unknown> = {
    id: stored.id,
    species_id: stored.speciesId,
    form_id: stored.formId,
    pvp_target_species: stored.pvpTargetSpecies,
    iv_min: stored.ivMin,
    iv_max: stored.ivMax,
    atk_min: stored.atkMin,
    atk_max: stored.atkMax,
    def_min: stored.defMin,
    def_max: stored.defMax,
    sta_min: stored.staMin,
    sta_max: stored.staMax,
    level_min: stored.levelMin,
    level_max: stored.levelMax,
    cp_min: stored.cpMin,
    cp_max: stored.cpMax,
    gender: stored.gender,
    // The evaluators match an exclusion on species AND form; the table only
    // stores a species today (`rules-repo.ts` writes `form_id: null`), and a
    // null form there means "every form of it".
    exclusions: (stored.exclusions ?? []).map((speciesId) => ({
      species_id: speciesId,
      form_id: null,
    })),
  }

  const league =
    stored.pvpLeague == null ? null : LEAGUE_BY_CAP[stored.pvpLeague]
  if (league) {
    row[`${league}_min`] = stored.pvpRankMin
    row[`${league}_max`] = stored.pvpRankMax
  }

  return row
}

function toRuleRows(stored: StoredRule[]): Record<string, unknown>[] {
  return stored.map(toRuleRow)
}

export { LEAGUE_BY_CAP, toRuleRow, toRuleRows }
