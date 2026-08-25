const { test, expect, describe } = require('bun:test')
const {
  matchesPokemonFilters,
  matchesFortFilters,
} = require('../src/services/golbat-dnf-match')

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

describe('matchesFortFilters', () => {
  test('is a pass-through -- no criterion exercises fort-side local filtering yet', () => {
    const match = matchesFortFilters([{ raid_level: { min: 5, max: 5 } }])
    expect(match({ raid_level: 1 })).toBe(true)
  })
})
