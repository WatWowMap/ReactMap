import type { Gender, GymEntity, PokemonEntity, Team } from './types'

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

/**
 * A fixed point in time that expiry is measured from. Date.now() here
 * would make every expiresAt differ between runs, which defeats the
 * reason these fixtures are seeded at all: a countdown that changes on
 * every reload cannot be compared against a screenshot from yesterday.
 */
const FIXTURE_EPOCH = Date.UTC(2026, 7, 24)

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

function pick<T>(rng: () => number, values: readonly [T, ...T[]]): T {
  return values[randomInt(rng, 0, values.length - 1)] as T
}

const TEAMS: readonly [Team, ...Team[]] = [0, 1, 2, 3]

/**
 * A viewport does not contain a uniform sample of the species list. A
 * dozen commons account for most of what is on screen, a wider pool of
 * regulars fills in around them, and anything else shows up rarely.
 * Drawing uniformly across all 493 instead made almost every fixture
 * visually distinct, which is close to the worst case for a cache keyed
 * on appearance and made these fixtures useless as evidence that one
 * works.
 */
const COMMON_SPECIES = [16, 19, 21, 23, 41, 43, 46, 52, 60, 69, 74, 96]
const REGULAR_SPECIES = [
  1, 4, 7, 10, 13, 25, 27, 29, 32, 35, 37, 39, 50, 54, 58, 63, 66, 72, 77, 79,
  81, 84, 90, 92, 100, 102, 104, 109, 111, 118,
]
const COMMON_SHARE = 0.65
const REGULAR_SHARE = 0.95
const MAX_SPECIES = 493

function randomSpecies(rng: () => number): number {
  const roll = rng()
  if (roll < COMMON_SHARE) {
    return COMMON_SPECIES[
      randomInt(rng, 0, COMMON_SPECIES.length - 1)
    ] as number
  }
  if (roll < REGULAR_SHARE) {
    return REGULAR_SPECIES[
      randomInt(rng, 0, REGULAR_SPECIES.length - 1)
    ] as number
  }
  return randomInt(rng, 1, MAX_SPECIES)
}

function buildPokemon(rng: () => number, index: number): PokemonEntity {
  const pokemonId = randomSpecies(rng)
  // Alternate forms belong to a minority of species, and even those spawn
  // in their default form most of the time. Costumes are event-limited and
  // rarer still. Gender is a property of the species: a tenth of them are
  // genderless, and the rest split evenly.
  const hasAlternateForms = pokemonId % 7 === 0
  const isGenderless = pokemonId % 10 === 0
  const gender: Gender = isGenderless ? 3 : rng() < 0.5 ? 1 : 2
  const entity: PokemonEntity = {
    kind: 'pokemon',
    spawnId: `pokemon-${index}`,
    pokemonId,
    form: hasAlternateForms && rng() < 0.4 ? randomInt(rng, 1, 3) : 0,
    costume: rng() < 0.02 ? randomInt(rng, 1, 2) : 0,
    gender,
    lat: randomInRange(rng, FIXTURE_AREA.south, FIXTURE_AREA.north),
    lon: randomInRange(rng, FIXTURE_AREA.west, FIXTURE_AREA.east),
    expiresAt: FIXTURE_EPOCH + randomInt(rng, 60, 1800) * 1000,
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
    gymId: `gym-${index}`,
    lat: randomInRange(rng, FIXTURE_AREA.south, FIXTURE_AREA.north),
    lon: randomInRange(rng, FIXTURE_AREA.west, FIXTURE_AREA.east),
    team: pick(rng, TEAMS),
    inBattle: rng() < 0.1,
  }
}

/**
 * Builds a fresh set every call. The cached getters below return the
 * same array identity, so a determinism test written against them
 * would pass without proving anything; these are what that test needs.
 */
export function generateFixturePokemon(): PokemonEntity[] {
  const rng = createRng(SEED)
  return Array.from({ length: POKEMON_COUNT }, (_, index) =>
    buildPokemon(rng, index),
  )
}

export function generateFixtureGyms(): GymEntity[] {
  // Separate seed offset so gym placement doesn't consume the same
  // PRNG stream as pokemon and shift its sequence.
  const rng = createRng(SEED + 1)
  return Array.from({ length: GYM_COUNT }, (_, index) => buildGym(rng, index))
}

let cachedPokemon: PokemonEntity[] | undefined
let cachedGyms: GymEntity[] | undefined

export function getFixturePokemon(): PokemonEntity[] {
  if (!cachedPokemon) cachedPokemon = generateFixturePokemon()
  return cachedPokemon
}

export function getFixtureGyms(): GymEntity[] {
  if (!cachedGyms) cachedGyms = generateFixtureGyms()
  return cachedGyms
}
