const { test, expect, describe, beforeAll, afterAll } = require('bun:test')
const { createGolbatClient } = require('../src/services/golbat-client')
const { computeDelta } = require('../src/services/delta-engine')
const {
  quarterBbox,
  scanPokemonComplete,
  scanFortsComplete,
} = require('../src/services/viewport-scanner')
const { startFakeGolbat } = require('../acceptance/support/fake-golbat-server')

describe('quarterBbox', () => {
  test('splits a bbox into four non-overlapping-except-at-edges quadrants', () => {
    const quarters = quarterBbox({
      min: { lat: 0, lon: 0 },
      max: { lat: 2, lon: 2 },
    })
    expect(quarters).toHaveLength(4)
    expect(quarters).toEqual([
      { min: { lat: 0, lon: 0 }, max: { lat: 1, lon: 1 } },
      { min: { lat: 0, lon: 1 }, max: { lat: 1, lon: 2 } },
      { min: { lat: 1, lon: 0 }, max: { lat: 2, lon: 1 } },
      { min: { lat: 1, lon: 1 }, max: { lat: 2, lon: 2 } },
    ])
  })
})

describe('subdivision against a fake Golbat', () => {
  /** @type {ReturnType<typeof startFakeGolbat>} */
  let fakeGolbat
  /** @type {ReturnType<typeof createGolbatClient>} */
  let client

  beforeAll(() => {
    fakeGolbat = startFakeGolbat()
    client = createGolbatClient({ apiUrl: fakeGolbat.url })
  })

  afterAll(() => {
    fakeGolbat.close()
  })

  test('4: a limit_reached response subdivides, and the merged result is complete', async () => {
    let callCount = 0
    fakeGolbat.setPokemonHandler((body) => {
      callCount += 1
      // The top-level (whole-viewport) request alone is truncated; every
      // quarter comes back well under the cap.
      const isTopLevel =
        body.min.lat === 0 &&
        body.min.lon === 0 &&
        body.max.lat === 2 &&
        body.max.lon === 2
      if (isTopLevel) {
        return {
          pokemon: [{ id: 'truncated-page', updated: 1 }],
          examined: 3000,
          skipped: 500,
          total: 3500,
          limit_reached: true,
        }
      }
      // Each quarter reports one distinct pokemon, keyed to its own bbox.
      const id = `q-${body.min.lat}-${body.min.lon}`
      return {
        pokemon: [{ id, updated: 1 }],
        examined: 1,
        skipped: 0,
        total: 1,
        limit_reached: false,
      }
    })

    const { entities, complete, subdivided } = await scanPokemonComplete(
      client,
      { min: { lat: 0, lon: 0 }, max: { lat: 2, lon: 2 } },
      { filters: [{ pokemon: [] }] },
    )

    expect(subdivided).toBe(true)
    expect(complete).toBe(true)
    // The truncated top-level page's own entity must not appear -- only
    // the four complete quarter reads are trusted.
    expect(entities.map((e) => e.id).sort()).toEqual([
      'q-0-0',
      'q-0-1',
      'q-1-0',
      'q-1-1',
    ])
    expect(callCount).toBe(5) // 1 truncated top-level + 4 quarters

    // Rule 1, end to end: reconciling this "complete" result against a
    // connection that was previously holding an entity Golbat's truncated
    // top-level page also didn't happen to return produces a removal --
    // exactly the behavior the brief warns is unsafe on a *truncated*
    // response, and exactly why this test asserts it only fires here,
    // after subdivision made the result actually complete.
    const previous = new Map([
      ['no-longer-there', { stamp: 1, selfEvicts: false }],
    ])
    const delta = computeDelta(previous, entities, { complete })
    expect(delta.removed).toEqual(['no-longer-there'])
  })

  test('a limit_reached response that stays truncated past maxDepth is reported incomplete, not silently complete', async () => {
    fakeGolbat.setPokemonHandler(() => ({
      pokemon: [{ id: 'always-truncated', updated: 1 }],
      examined: 3000,
      skipped: 1,
      total: 3001,
      limit_reached: true,
    }))

    const { complete, subdivided } = await scanPokemonComplete(
      client,
      { min: { lat: 0, lon: 0 }, max: { lat: 1, lon: 1 } },
      { filters: [{ pokemon: [] }] },
      { maxDepth: 1 },
    )
    expect(subdivided).toBe(true)
    expect(complete).toBe(false)

    // Feeding an incomplete result into computeDelta must never produce a
    // removal, matching rule 1.
    const previous = new Map([['held', { stamp: 1, selfEvicts: false }]])
    const delta = computeDelta(previous, [], { complete })
    expect(delta.removed).toEqual([])
  })

  test('forts: a truncated combined response subdivides and keeps gyms/pokestops/stations separate', async () => {
    fakeGolbat.setFortHandler((body) => {
      const isTopLevel =
        body.min.lat === 0 &&
        body.min.lon === 0 &&
        body.max.lat === 2 &&
        body.max.lon === 2
      if (isTopLevel) {
        return {
          gyms: [],
          pokestops: [],
          stations: [],
          examined: 9000,
          skipped: 1000,
          total: 10000,
          limit_reached: true,
        }
      }
      const id = `${body.min.lat}-${body.min.lon}`
      return {
        gyms: [{ id: `g-${id}`, updated: 1 }],
        pokestops: [{ id: `p-${id}`, updated: 1 }],
        stations: [],
        examined: 2,
        skipped: 0,
        total: 2,
        limit_reached: false,
      }
    })

    const { gyms, pokestops, stations, complete } = await scanFortsComplete(
      client,
      { min: { lat: 0, lon: 0 }, max: { lat: 2, lon: 2 } },
      { gyms: { filters: [] }, pokestops: { filters: [] } },
    )
    expect(complete).toBe(true)
    expect(gyms).toHaveLength(4)
    expect(pokestops).toHaveLength(4)
    expect(stations).toHaveLength(0)
  })
})
