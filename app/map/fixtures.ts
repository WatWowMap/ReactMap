import type { GymEntity, PokemonEntity } from './types'

/**
 * The area every fixture is scattered across. Chosen to comfortably
 * contain both the wide and narrow bounding boxes exercised by
 * source.test.ts.
 */
const FIXTURE_AREA = { west: -1, south: 51, east: 1, north: 52 }

/**
 * 3000 is the floor the test asserts: the whole reason for this engine
 * is that rendering past three thousand markers goes choppy, so the
 * fixture set has to clear that bar with room to spare rather than
 * exactly hit it.
 */
const POKEMON_COUNT = 5000
const GYM_COUNT = 100

const SEED = 20260824

/** Deterministic PRNG (mulberry32) so fixtures reproduce across runs. */
function createRng(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomInRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min)
}

function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(randomInRange(rng, min, max + 1))
}

function buildPokemon(rng: () => number, index: number): PokemonEntity {
  const now = Date.now()
  const entity: PokemonEntity = {
    kind: 'pokemon',
    id: `pokemon-${index}`,
    pokemonId: randomInt(rng, 1, 493),
    form: randomInt(rng, 0, 3),
    costume: randomInt(rng, 0, 2),
    gender: randomInt(rng, 1, 3),
    lat: randomInRange(rng, FIXTURE_AREA.south, FIXTURE_AREA.north),
    lon: randomInRange(rng, FIXTURE_AREA.west, FIXTURE_AREA.east),
    expiresAt: now + randomInt(rng, 60, 1800) * 1000,
  }
  if (rng() < 0.05) entity.badge = randomInt(rng, 1, 3)
  if (rng() < 0.1) entity.background = randomInt(rng, 1, 5)
  if (rng() < 0.15) entity.weather = randomInt(rng, 1, 7)
  if (rng() < 0.6) entity.iv = randomInt(rng, 0, 100)
  if (rng() < 0.6) entity.level = randomInt(rng, 1, 35)
  if (rng() < 0.4) entity.size = randomInt(rng, 1, 5)
  return entity
}

function buildGym(rng: () => number, index: number): GymEntity {
  return {
    kind: 'gym',
    id: `gym-${index}`,
    lat: randomInRange(rng, FIXTURE_AREA.south, FIXTURE_AREA.north),
    lon: randomInRange(rng, FIXTURE_AREA.west, FIXTURE_AREA.east),
    team: randomInt(rng, 0, 3),
    inBattle: rng() < 0.1,
  }
}

let cachedPokemon: PokemonEntity[] | undefined
let cachedGyms: GymEntity[] | undefined

export function getFixturePokemon(): PokemonEntity[] {
  if (!cachedPokemon) {
    const rng = createRng(SEED)
    cachedPokemon = Array.from({ length: POKEMON_COUNT }, (_, index) =>
      buildPokemon(rng, index),
    )
  }
  return cachedPokemon
}

export function getFixtureGyms(): GymEntity[] {
  if (!cachedGyms) {
    // Separate seed offset so gym placement doesn't consume the same
    // PRNG stream as pokemon and shift its sequence.
    const rng = createRng(SEED + 1)
    cachedGyms = Array.from({ length: GYM_COUNT }, (_, index) =>
      buildGym(rng, index),
    )
  }
  return cachedGyms
}
