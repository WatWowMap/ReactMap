import { describe, expect, test } from 'bun:test'
import { computeDelta } from '../src/services/delta-engine'
import {
  buildGymMatcher,
  buildPokemonMatcher,
  gymRuleMatches,
  matchesRange,
  pokemonRuleMatches,
  pvpRankMatches,
} from '../src/services/rule-local-filter'
import { translatePokemonRules } from '../src/services/rules-to-golbat-filters'

// ---------------------------------------------------------------------------
// matchesRange / pvpRankMatches -- the primitives.
// ---------------------------------------------------------------------------
describe('matchesRange', () => {
  test('no bounds set is unconstrained', () => {
    expect(matchesRange(null, null, null)).toBe(true)
    expect(matchesRange(5, null, null)).toBe(true)
  })
  test('a declared bound with no value never passes', () => {
    expect(matchesRange(null, 90, null)).toBe(false)
  })
  test('inclusive min/max', () => {
    expect(matchesRange(90, 90, 100)).toBe(true)
    expect(matchesRange(89, 90, 100)).toBe(false)
    expect(matchesRange(101, 90, 100)).toBe(false)
  })
})

// A realistic `pvp.great[]` array shaped from Golbat's ApiPvpEntry
// (decoder/api_pokemon_response.go) / gohbem's PokemonEntry
// (github.com/UnownHash/gohbem@v0.12.0 structs.go): pokemon/form/cap/rank
// with `evolution` only ever set for temp (mega) evolutions, never for a
// regular evolution-line entry, whose `pokemon` field IS the evolved
// species id (gohbem's ohbem.go QueryPvPRank recurses with
// evolution.Pokemon as the next call's own pokemonId).
const azumarillFamilyGreat = [
  { pokemon: 316, form: 0, cap: 40, rank: 3200 }, // Azurill, bad rank
  { pokemon: 317, form: 0, cap: 40, rank: 1800 }, // Marill, bad rank
  { pokemon: 184, form: 0, cap: 32.5, rank: 87 }, // Azumarill, real contender
]

describe('pvpRankMatches', () => {
  test('collapsed-best style: any entry in range passes', () => {
    expect(pvpRankMatches(azumarillFamilyGreat, 1, 250, null)).toBe(true)
  })
  test('no entry in range fails', () => {
    expect(pvpRankMatches(azumarillFamilyGreat, 1, 50, null)).toBe(false)
  })
  test('missing/empty pvp array never passes a declared bound', () => {
    expect(pvpRankMatches(undefined, 1, 250, null)).toBe(false)
    expect(pvpRankMatches([], 1, 250, null)).toBe(false)
  })
  test('targetSpeciesId narrows to one evolution; a different evolution qualifying does not count', () => {
    // Marill (317) alone would satisfy 1-2000, but the rule targets Azumarill (184).
    expect(pvpRankMatches(azumarillFamilyGreat, 1, 2000, 317)).toBe(true)
    expect(pvpRankMatches(azumarillFamilyGreat, 1, 100, 317)).toBe(false) // Marill's own rank (1800) is out of range
    expect(pvpRankMatches(azumarillFamilyGreat, 1, 100, 184)).toBe(true) // Azumarill's own rank (87) is in range
  })
})

// ---------------------------------------------------------------------------
// pokemonRuleMatches / buildPokemonMatcher
// ---------------------------------------------------------------------------
describe('pokemonRuleMatches: exclusion', () => {
  const rule = {
    id: 1,
    species_id: null,
    iv_min: 90,
    iv_max: 100,
    exclusions: [{ species_id: 19, form_id: null }], // Rattata
  }

  test('verification 1: an excluded species is rejected, another species is not', () => {
    expect(pokemonRuleMatches(rule, { pokemon_id: 19, form: 0, iv: 95 })).toBe(
      false,
    )
    expect(pokemonRuleMatches(rule, { pokemon_id: 1, form: 0, iv: 95 })).toBe(
      true,
    )
  })
})

describe('pokemonRuleMatches: verification 2, exclusion scope', () => {
  test('a rule with an exclusion does not suppress a different, independently matching rule', () => {
    const excludingRule = {
      id: 1,
      species_id: null,
      iv_min: 90,
      exclusions: [{ species_id: 19, form_id: null }],
    }
    // A second rule that genuinely matches this exact Rattata on its own
    // terms (any species, no IV floor at all).
    const catchAllRule = { id: 2, species_id: null }

    const rattata = { pokemon_id: 19, form: 0, iv: 95 }
    expect(pokemonRuleMatches(excludingRule, rattata)).toBe(false)
    expect(pokemonRuleMatches(catchAllRule, rattata)).toBe(true)

    const matcher = buildPokemonMatcher([excludingRule, catchAllRule])
    // Justification: the rules model spec is explicit -- "Does it show at
    // all? Any matching rule makes it visible" and "adding a rule can only
    // ever add visibility. No rule can hide what another shows, because
    // exclusions are rule local." catchAllRule genuinely, independently
    // matches this Rattata (it does not itself exclude Rattata), so the
    // entity shows despite excludingRule's veto.
    // Only rule 2's id lands on the wire: rule 1 vetoed this Rattata, so it
    // is not one of the rules that matched it.
    expect(matcher(rattata)).toEqual([2])
  })

  test('the soundness gap this module exists to close: a narrow, non-excluding rule must NOT vacuously pass for an entity it does not actually match', () => {
    const excludingRule = {
      id: 1,
      species_id: null,
      iv_min: 90,
      exclusions: [{ species_id: 19, form_id: null }],
    }
    // This rule has no local predicate at all (no exclusion, no PVP), but
    // its iv_min (100) is real and must still be checked -- treating "no
    // local predicate" as "trivially passes" would wrongly re-admit an
    // excluded Rattata whose IV is 95, not 100.
    const hundoOnlyRule = { id: 2, species_id: null, iv_min: 100 }

    const rattata95 = { pokemon_id: 19, form: 0, iv: 95 }
    expect(pokemonRuleMatches(hundoOnlyRule, rattata95)).toBe(false)

    const matcher = buildPokemonMatcher([excludingRule, hundoOnlyRule])
    expect(matcher(rattata95)).toEqual([])
  })
})

describe('pokemonRuleMatches: verification 3/4, PVP narrowing and targetSpeciesId', () => {
  const rule = {
    id: 1,
    species_id: null,
    great_min: 100,
    great_max: 500,
  }

  test('verification 3: rejects when the only qualifying rank is outside the real bound, accepts when inside it', () => {
    const outOfBound = {
      pokemon_id: 184,
      form: 0,
      pvp: { great: [{ pokemon: 184, form: 0, cap: 32.5, rank: 3200 }] },
    }
    const inBound = {
      pokemon_id: 184,
      form: 0,
      pvp: { great: [{ pokemon: 184, form: 0, cap: 32.5, rank: 250 }] },
    }
    expect(pokemonRuleMatches(rule, outOfBound)).toBe(false)
    expect(pokemonRuleMatches(rule, inBound)).toBe(true)
  })

  test('verification 4: targetSpeciesId set rejects an entity qualifying only via a different evolution', () => {
    const azumarillTargeted = {
      id: 2,
      species_id: null,
      great_min: 1,
      great_max: 500,
      pvp_target_species: 184, // Azumarill specifically
    }
    // Marill's own rank (1800) is what the caught entity would show, but
    // it's out of range; only Azumarill's entry (87) is in range, and the
    // rule cares about Azumarill specifically, so this must pass.
    const caughtAsMarill = {
      pokemon_id: 317,
      form: 0,
      pvp: { great: azumarillFamilyGreat },
    }
    expect(pokemonRuleMatches(azumarillTargeted, caughtAsMarill)).toBe(true)

    // Now the rule targets Marill instead -- Marill's own rank is out of
    // bound, and Azumarill's good rank must not count for a Marill-targeted rule.
    const marillTargeted = { ...azumarillTargeted, pvp_target_species: 317 }
    expect(pokemonRuleMatches(marillTargeted, caughtAsMarill)).toBe(false)
  })
})

describe('verification 5: a cleanly-matching rule is not defeated by an unrelated rule that would reject it', () => {
  test('OR across rules, not AND across local predicates', () => {
    const pvpRule = {
      id: 1,
      species_id: null,
      great_min: 100,
      great_max: 500,
    }
    const exclusionRule = {
      id: 2,
      species_id: null,
      exclusions: [{ species_id: 1, form_id: null }], // Bulbasaur excluded
    }
    // A Bulbasaur that ranks well in Great. exclusionRule alone would
    // reject it (it's the excluded species); pvpRule alone matches it
    // cleanly. Chosen semantics: OR across rules -- shown.
    const bulbasaur = {
      pokemon_id: 1,
      form: 0,
      pvp: { great: [{ pokemon: 1, form: 0, cap: 40, rank: 250 }] },
    }
    expect(pokemonRuleMatches(pvpRule, bulbasaur)).toBe(true)
    expect(pokemonRuleMatches(exclusionRule, bulbasaur)).toBe(false)
    const matcher = buildPokemonMatcher([pvpRule, exclusionRule])
    expect(matcher(bulbasaur)).toEqual([1])
  })
})

describe('verification 6: no rules at all matches nothing', () => {
  // Filtering is subtractive from nothing rather than from everything: a
  // user with no rules has asked for nothing, so nothing is sent. The map
  // a fresh account sees is populated by the seeded Everything rule
  // (auth/seed-profile.ts), not by a special case here.
  test('buildPokemonMatcher([])', () => {
    const matcher = buildPokemonMatcher([])
    expect(matcher({ pokemon_id: 1 })).toEqual([])
    expect(matcher({ pokemon_id: 999 })).toEqual([])
  })
  test('buildGymMatcher([])', () => {
    const matcher = buildGymMatcher([])
    expect(matcher({ raid_level: 5 })).toEqual([])
  })
})

describe('a matcher reports every rule that matched, not just the first', () => {
  test('two independently matching rules both land on the wire', () => {
    const hundos = { id: 7, species_id: null, iv_min: 100 }
    const dratini = { id: 12, species_id: 147 }
    const matcher = buildPokemonMatcher([hundos, dratini])
    // Sorted numerically: `[7, 12].sort()` is lexicographic and answers
    // `[12, 7]`, which is a trap rather than an assertion.
    const matched = matcher({ pokemon_id: 147, form: 0, iv: 100 })
    expect([...matched].sort((a, b) => a - b)).toEqual([7, 12])
    // Same species, wrong IV: only the species rule matched.
    expect(matcher({ pokemon_id: 147, form: 0, iv: 12 })).toEqual([12])
  })
})

// ---------------------------------------------------------------------------
// gymRuleMatches
// ---------------------------------------------------------------------------
describe('gymRuleMatches', () => {
  test('ex_eligible/in_battle are never sent upstream and are checked in full here', () => {
    const rule = { id: 1, raid_level: 5, ex_eligible: true }
    expect(gymRuleMatches(rule, { raid_level: 5, ex_raid_eligible: 0 })).toBe(
      false,
    )
    expect(gymRuleMatches(rule, { raid_level: 5, ex_raid_eligible: 1 })).toBe(
      true,
    )
    // raid_level mismatch must still reject even though ex_eligible is fine.
    expect(gymRuleMatches(rule, { raid_level: 3, ex_raid_eligible: 1 })).toBe(
      false,
    )
  })
})

// ---------------------------------------------------------------------------
// Verification 7: end to end, Task 3 -> this evaluator -> computeDelta.
// ---------------------------------------------------------------------------
describe('end to end: rules -> translatePokemonRules -> buildPokemonMatcher -> computeDelta', () => {
  test('the right entities survive the pipeline', () => {
    const rules = [
      {
        id: 1,
        species_id: null,
        iv_min: 90,
        exclusions: [{ species_id: 19, form_id: null }],
      },
      { id: 2, species_id: null, great_min: 100, great_max: 500 },
    ]

    const { upstream } = translatePokemonRules(rules)
    expect(upstream).not.toBeNull() // sanity: caller has something to send Golbat

    const matcher = buildPokemonMatcher(rules)
    const localFilter = (entity: any) => matcher(entity).length > 0

    // Fixture entities as if returned by Golbat for the upstream query above.
    const hundoRattata = {
      id: 'a',
      updated: 1,
      pokemon_id: 19,
      form: 0,
      iv: 100,
    } // excluded
    const hundoBulbasaur = {
      id: 'b',
      updated: 1,
      pokemon_id: 1,
      form: 0,
      iv: 100,
    } // rule 1 matches
    const lowIvGoodPvp = {
      id: 'c',
      updated: 1,
      pokemon_id: 184,
      form: 0,
      iv: 10,
      pvp: { great: [{ pokemon: 184, form: 0, cap: 32.5, rank: 250 }] },
    } // rule 2 matches despite failing rule 1's IV floor
    const nothingMatches = {
      id: 'd',
      updated: 1,
      pokemon_id: 999,
      form: 0,
      iv: 10,
    }

    const { added } = computeDelta(
      new Map(),
      [hundoRattata, hundoBulbasaur, lowIvGoodPvp, nothingMatches],
      { localFilter },
    )

    const addedIds = added.map((e) => e.id).sort()
    expect(addedIds).toEqual(['b', 'c'])
  })
})

describe('pokemonRuleMatches size range', () => {
  const xxlLarvitar = { id: 1, species_id: 246, size_min: 5, size_max: 5 }

  test('an entity inside the size range matches', () => {
    expect(
      pokemonRuleMatches(xxlLarvitar, { pokemon_id: 246, form: 0, size: 5 }),
    ).toBe(true)
  })

  test('an entity outside the size range does not', () => {
    expect(
      pokemonRuleMatches(xxlLarvitar, { pokemon_id: 246, form: 0, size: 3 }),
    ).toBe(false)
  })

  test('a declared size bound an entity cannot answer never passes', () => {
    expect(pokemonRuleMatches(xxlLarvitar, { pokemon_id: 246, form: 0 })).toBe(
      false,
    )
  })

  test('a rule with no size bounds ignores the entity size entirely', () => {
    const anySize = { id: 2, species_id: 246 }
    expect(
      pokemonRuleMatches(anySize, { pokemon_id: 246, form: 0, size: 1 }),
    ).toBe(true)
  })
})
