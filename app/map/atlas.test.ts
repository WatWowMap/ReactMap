import { expect, test } from 'bun:test'
import { createAtlas, type IconDescriptor, iconKeyFor, LruCache } from './atlas'
import { getFixturePokemon } from './fixtures'
import type { PokemonEntity } from './types'

const BASE: PokemonEntity = {
  kind: 'pokemon',
  spawnId: 'spawn-a',
  pokemonId: 6,
  form: 0,
  costume: 0,
  gender: 1,
  lat: 51.5,
  lon: 0,
  expiresAt: 1_000,
}

test('two entities identical in appearance but differing in position, expiry, spawnId and stats share a key', () => {
  const a: PokemonEntity = { ...BASE }
  const b: PokemonEntity = {
    ...BASE,
    spawnId: 'spawn-b',
    lat: 40,
    lon: 90,
    expiresAt: 999_999,
    iv: 100,
    level: 35,
    size: 5,
  }
  expect(iconKeyFor(a)).toBe(iconKeyFor(b))
})

test('a difference in pokemonId changes the key', () => {
  expect(iconKeyFor(BASE)).not.toBe(iconKeyFor({ ...BASE, pokemonId: 7 }))
})

test('a difference in form changes the key', () => {
  expect(iconKeyFor(BASE)).not.toBe(iconKeyFor({ ...BASE, form: 1 }))
})

test('a difference in costume changes the key', () => {
  expect(iconKeyFor(BASE)).not.toBe(iconKeyFor({ ...BASE, costume: 1 }))
})

test('a difference in gender changes the key', () => {
  expect(iconKeyFor(BASE)).not.toBe(iconKeyFor({ ...BASE, gender: 2 }))
})

test('an entity carrying a badge produces a different key than one without one', () => {
  expect(iconKeyFor(BASE)).not.toBe(iconKeyFor({ ...BASE, badge: 1 }))
})

test('an entity carrying a background produces a different key than one without one', () => {
  expect(iconKeyFor(BASE)).not.toBe(iconKeyFor({ ...BASE, background: 1 }))
})

test('an entity carrying weather produces a different key than one without it', () => {
  expect(iconKeyFor(BASE)).not.toBe(iconKeyFor({ ...BASE, weather: 1 }))
})

test('an absent optional field cannot collide with a present one sharing its numeric value', () => {
  // badge=1 vs no badge must differ, even though '1' vs '' would tempt a
  // naive string join into looking equal after trimming.
  const withBadge: PokemonEntity = { ...BASE, badge: 1 }
  const withoutBadge: PokemonEntity = { ...BASE }
  expect(iconKeyFor(withBadge)).not.toBe(iconKeyFor(withoutBadge))
})

/**
 * The capacity `createAtlas` defaults to. Duplicated rather than exported
 * from atlas.ts so that moving the default is a deliberate edit here too.
 */
const DEFAULT_CAPACITY = 512

/**
 * A box inside the fixture area holding roughly one screenful of markers.
 * Viewport scale is the condition that matters: the map draws a few hundred
 * markers at a time, not all five thousand.
 */
const VIEWPORT = { west: -0.12, south: 51.25, east: 0.12, north: 51.75 }

/**
 * Thresholds are a floor on usefulness, not a record of the current number.
 * A cache that serves under a quarter of a cold viewport pass is not paying
 * for itself, and the fixture feeding it has stopped resembling a real
 * viewport. Measured against the fixtures at the time of writing: 42.5
 * percent over a viewport batch and 73.2 percent over the full set, so both
 * floors have room beneath them. Uniformly random fixtures score 1.1 and 1.4
 * percent, so the gap either side of these lines is wide.
 */
const VIEWPORT_MIN_HIT_RATE = 0.25
const FULL_SET_MIN_HIT_RATE = 0.5

function viewportBatch(): PokemonEntity[] {
  return getFixturePokemon().filter(
    (entity) =>
      entity.lat >= VIEWPORT.south &&
      entity.lat <= VIEWPORT.north &&
      entity.lon >= VIEWPORT.west &&
      entity.lon <= VIEWPORT.east,
  )
}

/** An atlas that counts composites, so a pass reports its own hit rate. */
function countingAtlas() {
  let draws = 0
  const atlas = createAtlas({
    capacity: DEFAULT_CAPACITY,
    draw: (_entity, key): IconDescriptor => {
      draws += 1
      return { id: key, url: `data:${key}`, width: 32, height: 32 }
    },
  })
  return {
    pass(entities: PokemonEntity[]) {
      const before = draws
      for (const entity of entities) atlas.getIconFor(entity)
      const drawn = draws - before
      return { drawn, hitRate: 1 - drawn / entities.length }
    },
  }
}

test('a cold pass over a viewport-sized batch serves a quarter of its markers from cache', () => {
  const batch = viewportBatch()
  expect(batch.length).toBeGreaterThan(100)
  expect(countingAtlas().pass(batch).hitRate).toBeGreaterThanOrEqual(
    VIEWPORT_MIN_HIT_RATE,
  )
})

test('a cold pass over the whole fixture set serves half its markers from cache', () => {
  const pokemon = getFixturePokemon()
  // The engine exists because past three thousand markers the old renderer
  // goes choppy, so the fixture set has to clear that bar to be evidence.
  expect(pokemon.length).toBeGreaterThanOrEqual(3000)
  expect(countingAtlas().pass(pokemon).hitRate).toBeGreaterThanOrEqual(
    FULL_SET_MIN_HIT_RATE,
  )
})

test("a viewport's icons fit inside capacity, so a second pass over it draws nothing", () => {
  const batch = viewportBatch()
  const atlas = countingAtlas()
  atlas.pass(batch)
  // Nothing was evicted during the first pass, so every marker still on
  // screen is already composited. This is what makes panning and redrawing
  // cheap, and it fails the moment a viewport's icon variety outgrows the
  // cache.
  expect(atlas.pass(batch).drawn).toBe(0)
})

test('LruCache returns what was set', () => {
  const cache = new LruCache<string, number>(3)
  cache.set('a', 1)
  expect(cache.get('a')).toBe(1)
  expect(cache.get('missing')).toBeUndefined()
})

test('LruCache evicts the least recently used entry once over capacity', () => {
  const cache = new LruCache<string, number>(2)
  cache.set('a', 1)
  cache.set('b', 2)
  cache.set('c', 3) // capacity 2: 'a' is oldest, evicted
  expect(cache.has('a')).toBe(false)
  expect(cache.has('b')).toBe(true)
  expect(cache.has('c')).toBe(true)
  expect(cache.size).toBe(2)
})

test('LruCache reading a key refreshes its recency, so it survives the next eviction', () => {
  const cache = new LruCache<string, number>(2)
  cache.set('a', 1)
  cache.set('b', 2)
  cache.get('a') // touch 'a': 'b' is now the oldest
  cache.set('c', 3)
  expect(cache.has('a')).toBe(true)
  expect(cache.has('b')).toBe(false)
  expect(cache.has('c')).toBe(true)
})

test('LruCache never exceeds its bound across many insertions', () => {
  const cache = new LruCache<number, number>(50)
  for (let i = 0; i < 5000; i++) {
    cache.set(i, i)
    expect(cache.size).toBeLessThanOrEqual(50)
  }
  expect(cache.size).toBe(50)
})

test('rejects a non-positive capacity', () => {
  expect(() => new LruCache(0)).toThrow()
})

test('clear empties the cache', () => {
  const cache = new LruCache<string, number>(3)
  cache.set('a', 1)
  cache.set('b', 2)
  cache.clear()
  expect(cache.size).toBe(0)
  expect(cache.has('a')).toBe(false)
  expect(cache.get('b')).toBeUndefined()
})

test('atlas.clear forces the next getIconFor for a previously-cached key to redraw', () => {
  let drawCount = 0
  const atlas = createAtlas({
    capacity: 10,
    draw: (_entity, key): IconDescriptor => {
      drawCount += 1
      return { id: key, url: `data:${key}`, width: 32, height: 32 }
    },
  })

  atlas.getIconFor(BASE)
  atlas.getIconFor(BASE)
  expect(drawCount).toBe(1)

  atlas.clear()
  atlas.getIconFor(BASE)

  expect(drawCount).toBe(2)
  expect(atlas.cache.size).toBe(1)
})

test('getIconFor draws once per distinct key and reuses the cached descriptor on repeats', () => {
  let drawCount = 0
  const seenKeys: string[] = []
  const atlas = createAtlas({
    capacity: 10,
    draw: (_entity, key): IconDescriptor => {
      drawCount += 1
      seenKeys.push(key)
      return { id: key, url: `data:${key}`, width: 32, height: 32 }
    },
  })

  const a: PokemonEntity = { ...BASE }
  const sameAppearance: PokemonEntity = { ...BASE, spawnId: 'spawn-other' }
  const differentAppearance: PokemonEntity = { ...BASE, pokemonId: 999 }

  const first = atlas.getIconFor(a)
  const second = atlas.getIconFor(sameAppearance)
  const third = atlas.getIconFor(differentAppearance)

  expect(drawCount).toBe(2)
  expect(second).toEqual(first)
  expect(third).not.toEqual(first)
  expect(seenKeys).toEqual([iconKeyFor(a), iconKeyFor(differentAppearance)])
})

test('getIconFor respects the configured capacity via the exposed cache', () => {
  const atlas = createAtlas({
    capacity: 4,
    draw: (_entity, key): IconDescriptor => ({
      id: key,
      url: `data:${key}`,
      width: 32,
      height: 32,
    }),
  })

  const pokemon = getFixturePokemon().slice(0, 200)
  for (const entity of pokemon) {
    atlas.getIconFor(entity)
    expect(atlas.cache.size).toBeLessThanOrEqual(4)
  }
})
