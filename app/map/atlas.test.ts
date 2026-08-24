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

test('keying on spawnId instead of pokemonId would fail this: 5000 fixture pokemon collapse into far fewer appearance keys', () => {
  const pokemon = getFixturePokemon()
  const keys = new Set(pokemon.map(iconKeyFor))
  const spawnIds = new Set(pokemon.map((entity) => entity.spawnId))
  // Every fixture has a distinct spawnId (spawnIds.size === pokemon.length),
  // so a key that incorporated spawnId would produce exactly that many
  // distinct keys too, and this cache would never hit. The appearance key
  // must collapse below that: several fixtures share a species with the
  // same form/costume/gender/badge/background/weather combination.
  expect(pokemon.length).toBeGreaterThanOrEqual(3000)
  expect(spawnIds.size).toBe(pokemon.length)
  expect(keys.size).toBeLessThan(spawnIds.size)
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
