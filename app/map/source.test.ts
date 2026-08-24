import { expect, test } from 'bun:test'
import { createFixtureSource } from './source'

test('returns only entities inside the requested bounds', async () => {
  const source = createFixtureSource()
  const inside = await source.query({
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
  const all = await source.query({
    kind: 'pokemon',
    bounds: { west: -1, south: 51, east: 1, north: 52 },
    zoom: 12,
  })
  expect(all.length).toBeGreaterThanOrEqual(3000)
})
