import { expect, test } from 'bun:test'
import { mergeGym, translateGymPatch, translatePokemon } from './translate'
import type { RawEntity } from './wire'

/** decoder/api_pokemon_response.go:44-84, as Golbat's encoder emits it. */
function rawPokemon(overrides: RawEntity = {}): RawEntity {
  return {
    id: 'encounter-1',
    pokestop_id: null,
    spawn_id: null,
    lat: 51.5,
    lon: -0.1,
    weight: null,
    size: null,
    height: null,
    expire_timestamp: 1_700_000_000,
    updated: 1_699_999_000,
    pokemon_id: 25,
    gender: null,
    iv: null,
    form: null,
    level: null,
    weather: null,
    costume: null,
    expire_timestamp_verified: false,
    ...overrides,
  }
}

test('translates a Golbat pokemon into the client shape', () => {
  const entity = translatePokemon(
    rawPokemon({
      gender: 2,
      form: 63,
      costume: 1,
      weather: 3,
      iv: 91.1,
      level: 27,
      size: 4,
      expire_timestamp_verified: true,
    }),
  )
  expect(entity).toEqual({
    kind: 'pokemon',
    spawnId: 'encounter-1',
    pokemonId: 25,
    form: 63,
    costume: 1,
    gender: 2,
    weather: 3,
    lat: 51.5,
    lon: -0.1,
    expiresAt: 1_700_000_000_000,
    expiresAtVerified: true,
    iv: 91.1,
    level: 27,
    size: 4,
  })
})

test('leaves nullable stats off rather than inventing them', () => {
  const entity = translatePokemon(rawPokemon())
  expect(entity).not.toBeNull()
  expect(entity).not.toHaveProperty('iv')
  expect(entity).not.toHaveProperty('level')
  expect(entity).not.toHaveProperty('size')
  expect(entity).not.toHaveProperty('weather')
  // Golbat's own unset value for all three, and what the icon system means
  // by "base form".
  expect(entity?.form).toBe(0)
  expect(entity?.costume).toBe(0)
  expect(entity?.gender).toBe(0)
  expect(entity?.expiresAtVerified).toBe(false)
})

test('carries the matched rule ids through to the entity', () => {
  const entity = translatePokemon(rawPokemon({ matched: [7, 12] }))
  expect(entity?.matched).toEqual([7, 12])
})

test('keeps only numeric matched ids, and omits matched when absent', () => {
  // The wire type says number[], but this is the one seam that sees the
  // raw payload, and `resolveAppearance` looks every id up in a map.
  const mixed = translatePokemon(
    rawPokemon({ matched: [7, 'nine', null, 12] as unknown as number[] }),
  )
  expect(mixed?.matched).toEqual([7, 12])
  expect(translatePokemon(rawPokemon())).not.toHaveProperty('matched')
  expect(translatePokemon(rawPokemon({ matched: null }))).not.toHaveProperty(
    'matched',
  )
})

test('drops a pokemon missing anything a marker cannot be placed without', () => {
  expect(translatePokemon(rawPokemon({ id: null }))).toBeNull()
  expect(translatePokemon(rawPokemon({ lat: null }))).toBeNull()
  expect(translatePokemon(rawPokemon({ expire_timestamp: null }))).toBeNull()
  expect(translatePokemon(rawPokemon({ pokemon_id: null }))).toBeNull()
})

test('translates a full gym scan row', () => {
  const patch = translateGymPatch({
    id: 'gym-1',
    lat: 51.5,
    lon: -0.1,
    team_id: 2,
    in_battle: 1,
  })
  expect(patch).toEqual({
    gymId: 'gym-1',
    lat: 51.5,
    lon: -0.1,
    team: 2,
    inBattle: true,
  })
})

test('a raid webhook patch carries no battle state, and does not claim to', () => {
  const patch = translateGymPatch({
    id: 'gym-1',
    lat: 51.5,
    lon: -0.1,
    team_id: 1,
    raid_level: 5,
    updated: 1_700_000_000,
  })
  expect(patch).not.toHaveProperty('inBattle')
})

test('merging a patch keeps the fields the patch did not carry', () => {
  const first = mergeGym(undefined, {
    gymId: 'gym-1',
    lat: 51.5,
    lon: -0.1,
    team: 3,
    inBattle: true,
  })
  expect(first).toEqual({
    kind: 'gym',
    gymId: 'gym-1',
    lat: 51.5,
    lon: -0.1,
    team: 3,
    inBattle: true,
  })
  const merged = mergeGym(first ?? undefined, { gymId: 'gym-1', team: 1 })
  expect(merged).toEqual({
    kind: 'gym',
    gymId: 'gym-1',
    lat: 51.5,
    lon: -0.1,
    team: 1,
    inBattle: true,
  })
})

test('a gym with nowhere to be drawn is not renderable', () => {
  expect(mergeGym(undefined, { gymId: 'gym-1', team: 1 })).toBeNull()
})

test('a fold that changes nothing hands back the existing gym itself', () => {
  const existing = mergeGym(undefined, {
    gymId: 'gym-1',
    lat: 51.5,
    lon: -0.1,
    team: 2,
    inBattle: false,
  })
  expect(existing).not.toBeNull()

  // Identity, not equality: the store skips its write on `===`.
  expect(mergeGym(existing ?? undefined, { gymId: 'gym-1', team: 2 })).toBe(
    existing,
  )
  expect(
    mergeGym(existing ?? undefined, {
      gymId: 'gym-1',
      lat: 51.5,
      lon: -0.1,
      team: 2,
      inBattle: false,
    }),
  ).toBe(existing)
  expect(
    mergeGym(existing ?? undefined, { gymId: 'gym-1', inBattle: true }),
  ).not.toBe(existing)
})
