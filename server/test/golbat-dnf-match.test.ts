import { describe, expect, test } from 'bun:test'
import {
  matchesFortFilters,
  matchesPokemonFilters,
} from '../src/services/golbat-dnf-match'

describe('matchesPokemonFilters', () => {
  test('an empty filters array matches everything -- "no filter configured"', () => {
    const match = matchesPokemonFilters([])
    expect(match({ pokemon_id: 1 })).toBe(true)
    expect(match({ pokemon_id: 999 })).toBe(true)
  })

  test('a species clause matches only that id', () => {
    const match = matchesPokemonFilters([{ pokemon: [{ id: 1, form: null }] }])
    expect(match({ pokemon_id: 1 })).toBe(true)
    expect(match({ pokemon_id: 99 })).toBe(false)
  })

  test('a form-scoped clause requires the form to match too', () => {
    const match = matchesPokemonFilters([{ pokemon: [{ id: 1, form: 2 }] }])
    expect(match({ pokemon_id: 1, form: 2 })).toBe(true)
    expect(match({ pokemon_id: 1, form: 3 })).toBe(false)
  })

  test('an omitted form on the clause matches any form of that species', () => {
    const match = matchesPokemonFilters([{ pokemon: [{ id: 1, form: null }] }])
    expect(match({ pokemon_id: 1, form: 7 })).toBe(true)
  })

  test('clauses are OR-ed', () => {
    const match = matchesPokemonFilters([
      { pokemon: [{ id: 1, form: null }] },
      { pokemon: [{ id: 4, form: null }] },
    ])
    expect(match({ pokemon_id: 1 })).toBe(true)
    expect(match({ pokemon_id: 4 })).toBe(true)
    expect(match({ pokemon_id: 7 })).toBe(false)
  })

  test('range fields within one clause are AND-ed', () => {
    const match = matchesPokemonFilters([
      { pokemon: [{ id: 1, form: null }], iv: { min: 90, max: 100 } },
    ])
    expect(match({ pokemon_id: 1, iv: 95 })).toBe(true)
    expect(match({ pokemon_id: 1, iv: 50 })).toBe(false)
    // A declared bound that can't be verified never passes.
    expect(match({ pokemon_id: 1, iv: null })).toBe(false)
  })

  test('gender is an array match, not a range', () => {
    const match = matchesPokemonFilters([
      { pokemon: [{ id: 1, form: null }], gender: [1] },
    ])
    expect(match({ pokemon_id: 1, gender: 1 })).toBe(true)
    expect(match({ pokemon_id: 1, gender: 2 })).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Task 6: fort clauses. Webhook-pushed gyms never pass through Golbat's own
// filtering (Golbat sends every subscriber the same payload), so this is the
// only thing standing between a raid the client asked for and one it did not.
// ---------------------------------------------------------------------------

describe('matchesFortFilters', () => {
  const gym = {
    id: 'g1',
    raid_level: 5,
    raid_pokemon_id: 150,
    raid_pokemon_form: 0,
    team_id: 1,
    available_slots: 3,
    ar_scan_eligible: 1,
  }

  test('no clauses means no filter -- the whole viewport passes', () => {
    expect(matchesFortFilters([])(gym)).toBe(true)
  })

  test('a matching raid_level passes and a non-matching one is rejected', () => {
    expect(matchesFortFilters([{ raid_level: [5] }])(gym)).toBe(true)
    expect(matchesFortFilters([{ raid_level: [1, 3] }])(gym)).toBe(false)
  })

  test('clauses are OR-ed -- DNF, so one match is enough', () => {
    expect(
      matchesFortFilters([{ raid_level: [1] }, { raid_level: [5] }])(gym),
    ).toBe(true)
  })

  test('constraints within one clause are AND-ed', () => {
    expect(matchesFortFilters([{ raid_level: [5], team_id: [1] }])(gym)).toBe(
      true,
    )
    expect(matchesFortFilters([{ raid_level: [5], team_id: [2] }])(gym)).toBe(
      false,
    )
  })

  test('raid_pokemon_id matches an id/form pair, with a null form matching any form', () => {
    expect(
      matchesFortFilters([{ raid_pokemon_id: [{ pokemon_id: 150, form: 0 }] }])(
        gym,
      ),
    ).toBe(true)
    expect(
      matchesFortFilters([
        { raid_pokemon_id: [{ pokemon_id: 150, form: null }] },
      ])(gym),
    ).toBe(true)
    expect(
      matchesFortFilters([{ raid_pokemon_id: [{ pokemon_id: 150, form: 1 }] }])(
        gym,
      ),
    ).toBe(false)
    expect(
      matchesFortFilters([{ raid_pokemon_id: [{ pokemon_id: 149 }] }])(gym),
    ).toBe(false)
  })

  test('available_slots is an inclusive range', () => {
    expect(
      matchesFortFilters([{ available_slots: { min: 1, max: 6 } }])(gym),
    ).toBe(true)
    expect(
      matchesFortFilters([{ available_slots: { min: 4, max: 6 } }])(gym),
    ).toBe(false)
  })

  test('is_ar_scan_eligible reads the entity`s 0/1 column as a boolean', () => {
    expect(matchesFortFilters([{ is_ar_scan_eligible: true }])(gym)).toBe(true)
    expect(matchesFortFilters([{ is_ar_scan_eligible: false }])(gym)).toBe(
      false,
    )
    expect(
      matchesFortFilters([{ is_ar_scan_eligible: false }])({
        ...gym,
        ar_scan_eligible: 0,
      }),
    ).toBe(true)
  })

  test('a null field is a real answer and rejects -- a gym with no raid has no level', () => {
    expect(
      matchesFortFilters([{ raid_level: [5] }])({ id: 'g2', raid_level: null }),
    ).toBe(false)
  })

  test('an ABSENT field is unknown, not a rejection -- webhook entities are patches', () => {
    // A gym_details payload carries no raid state at all
    // (decoder/gym_state.go:145-163). Rejecting it against a raid filter
    // would drop a change to a gym the client is legitimately watching.
    expect(matchesFortFilters([{ raid_level: [5] }])({ id: 'g3' })).toBe(true)
  })
})
