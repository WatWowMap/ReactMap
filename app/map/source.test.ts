import { expect, test } from 'bun:test'
import { queryOnce } from './query'
import { createFixtureSource } from './source'
import type { MapChangeHandler, MapEntity, MapSource } from './types'

test('returns only entities inside the requested bounds', async () => {
  const source = createFixtureSource()
  const inside = await queryOnce(source, {
    kind: 'pokemon',
    bounds: { west: -0.1, south: 51.5, east: 0.1, north: 51.6 },
    zoom: 15,
  })
  expect(inside.length).toBeGreaterThan(0)
  for (const entity of inside) {
    expect(entity.lon).toBeGreaterThanOrEqual(-0.1)
    expect(entity.lon).toBeLessThanOrEqual(0.1)
    expect(entity.lat).toBeGreaterThanOrEqual(51.5)
    expect(entity.lat).toBeLessThanOrEqual(51.6)
  }
})

test('produces enough pokemon to exercise the count problem', async () => {
  const source = createFixtureSource()
  const all = await queryOnce(source, {
    kind: 'pokemon',
    bounds: { west: -1, south: 51, east: 1, north: 52 },
    zoom: 12,
  })
  expect(all.length).toBeGreaterThanOrEqual(3000)
})

test('subscribe delivers the current set and returns an unsubscribe', () => {
  const source = createFixtureSource()
  const deliveries: MapEntity[][] = []
  const unsubscribe = source.subscribe(
    {
      kind: 'gym',
      bounds: { west: -1, south: 51, east: 1, north: 52 },
      zoom: 12,
    },
    (entities) => deliveries.push(entities),
  )

  expect(deliveries).toHaveLength(1)
  expect(deliveries[0]?.length).toBeGreaterThan(0)
  expect(typeof unsubscribe).toBe('function')
  expect(() => unsubscribe()).not.toThrow()
})

test('queryOnce stops listening after the first delivery', async () => {
  let deliveries = 0
  let stopped = false
  const source: MapSource = {
    subscribe(_request, onChange: MapChangeHandler) {
      deliveries += 1
      onChange([])
      return () => {
        stopped = true
      }
    },
  }

  const result = await queryOnce(source, {
    kind: 'pokemon',
    bounds: { west: -1, south: 51, east: 1, north: 52 },
    zoom: 12,
  })

  expect(result).toEqual([])
  expect(deliveries).toBe(1)
  expect(stopped).toBe(true)
})

test('spawnId is unique per entity while pokemonId repeats across species', async () => {
  const source = createFixtureSource()
  const all = await queryOnce(source, {
    kind: 'pokemon',
    bounds: { west: -1, south: 51, east: 1, north: 52 },
    zoom: 12,
  })
  const pokemon = all.filter((entity) => entity.kind === 'pokemon')

  const spawnIds = new Set(pokemon.map((entity) => entity.spawnId))
  const speciesIds = new Set(pokemon.map((entity) => entity.pokemonId))

  expect(spawnIds.size).toBe(pokemon.length)
  // Anything caching by appearance must key on pokemonId: there are far
  // fewer species than spawns, which is the whole point of the cache.
  expect(speciesIds.size).toBeLessThan(pokemon.length / 2)
})
