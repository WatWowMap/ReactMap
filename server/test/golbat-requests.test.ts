import { describe, expect, test } from 'bun:test'
import {
  buildFortScanBody,
  buildPokemonScanBody,
  clampLimit,
} from '../src/services/golbat-requests'

describe('clampLimit', () => {
  test('a requested limit under the cap is sent unchanged', () => {
    expect(clampLimit(500, 3000)).toBe(500)
  })

  test('a requested limit over the cap is clamped down to the cap', () => {
    expect(clampLimit(50_000, 3000)).toBe(3000)
  })

  test('no cap known yet sends the requested value as-is', () => {
    expect(clampLimit(50_000, null)).toBe(50_000)
    expect(clampLimit(50_000, undefined)).toBe(50_000)
    expect(clampLimit(50_000, 0)).toBe(50_000)
  })

  test('no requested limit (or 0/negative) is left as 0, Golbat\'s own "use server default"', () => {
    expect(clampLimit(undefined, 3000)).toBe(0)
    expect(clampLimit(0, 3000)).toBe(0)
    expect(clampLimit(-5, 3000)).toBe(0)
  })
})

describe('buildPokemonScanBody', () => {
  const min = { lat: 1, lon: 2 }
  const max = { lat: 3, lon: 4 }

  test('matches decoder/api_pokemon_scan_v3.go:12-17 (ApiPokemonScan3)', () => {
    const body = buildPokemonScanBody(
      { min, max, limit: 100, filters: [{ pokemon: [] }] },
      { maxPokemonResults: 3000 },
    )
    expect(body).toEqual({
      min,
      max,
      limit: 100,
      filters: [{ pokemon: [] }],
    })
  })

  test('clamps limit to the reported cap', () => {
    const body = buildPokemonScanBody(
      { min, max, limit: 50_000 },
      { maxPokemonResults: 3000 },
    )
    expect(body.limit).toBe(3000)
  })

  test('an omitted filters array is sent as [] (matches nothing, not everything -- decoder/api_pokemon_common.go:130-146), not defaulted to a wildcard', () => {
    const body = buildPokemonScanBody({ min, max }, null)
    expect(body.filters).toEqual([])
  })
})

describe('buildFortScanBody', () => {
  const min = { lat: 1, lon: 2 }
  const max = { lat: 3, lon: 4 }

  test('matches decoder/api_fort.go:33-42 (ApiFortCombinedScan)', () => {
    const body = buildFortScanBody(
      {
        min,
        max,
        limit: 100,
        withIncidents: true,
        gyms: { filters: [] },
        pokestops: { filters: [{ lure_id: [501] }] },
      },
      { maxFortResults: 9000 },
    )
    expect(body).toEqual({
      min,
      max,
      limit: 100,
      with_incidents: true,
      gyms: { filters: [] },
      pokestops: { filters: [{ lure_id: [501] }] },
      stations: null,
    })
  })

  test('an omitted fort type group is excluded from the result, per decoder/api_fort.go:55-59', () => {
    const body = buildFortScanBody({ min, max, gyms: { filters: [] } }, null)
    expect(body.gyms).toEqual({ filters: [] })
    expect(body.pokestops).toBeNull()
    expect(body.stations).toBeNull()
  })

  test('clamps limit to the reported fort cap', () => {
    const body = buildFortScanBody(
      { min, max, limit: 50_000 },
      { maxFortResults: 9000 },
    )
    expect(body.limit).toBe(9000)
  })
})
