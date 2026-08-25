import { describe, expect, test } from 'bun:test'
import {
  GolbatMalformedResponseError,
  parseAvailableForts,
  parseAvailableGyms,
  parseAvailablePokemon,
  parseAvailablePokestops,
  parseAvailableStations,
  parseFortScanResponse,
  parsePokemonScanResponse,
  parseStatus,
} from '../src/services/golbat-responses'

describe('parseStatus', () => {
  test('parses decoder/api_status.go:11-19 (ApiStatusResult)', () => {
    const parsed = parseStatus({
      features: { fort_in_memory: true },
      limits: { max_pokemon_results: 3000, max_fort_results: 9000 },
    })
    expect(parsed).toEqual({
      fortInMemory: true,
      maxPokemonResults: 3000,
      maxFortResults: 9000,
    })
  })

  test('fort_in_memory: false parses to fortInMemory: false', () => {
    const parsed = parseStatus({
      features: { fort_in_memory: false },
      limits: { max_pokemon_results: 3000, max_fort_results: 9000 },
    })
    expect(parsed.fortInMemory).toBe(false)
  })

  test('a malformed status body throws GolbatMalformedResponseError', () => {
    expect(() => parseStatus({})).toThrow(GolbatMalformedResponseError)
    expect(() => parseStatus(null)).toThrow(GolbatMalformedResponseError)
    expect(() => parseStatus('not json')).toThrow(GolbatMalformedResponseError)
  })
})

describe('parsePokemonScanResponse', () => {
  test('parses decoder/api_pokemon_response.go:167-175 (ApiPokemonScanResultV3), preserving limit_reached', () => {
    const parsed = parsePokemonScanResponse({
      pokemon: [{ id: '1', pokemon_id: 25 }],
      examined: 10,
      skipped: 2,
      total: 12,
      limit_reached: true,
    })
    expect(parsed).toEqual({
      pokemon: [{ id: '1', pokemon_id: 25 }],
      examined: 10,
      skipped: 2,
      total: 12,
      limitReached: true,
    })
  })

  test('entities are passed through verbatim in Golbat field names, not reshaped', () => {
    const raw = { id: '123', pokemon_id: 1, atk_iv: 15, pvp: { great: [] } }
    const parsed = parsePokemonScanResponse({
      pokemon: [raw],
      examined: 0,
      skipped: 0,
      total: 0,
      limit_reached: false,
    })
    expect(parsed.pokemon[0]).toBe(raw)
  })

  test('missing pokemon array throws GolbatMalformedResponseError', () => {
    expect(() => parsePokemonScanResponse({})).toThrow(
      GolbatMalformedResponseError,
    )
  })
})

describe('parseFortScanResponse', () => {
  test('parses decoder/api_fort.go:150-158 (ApiFortCombinedScanResult)', () => {
    const parsed = parseFortScanResponse({
      gyms: [{ id: 'g1' }],
      pokestops: [],
      stations: [],
      examined: 5,
      skipped: 1,
      total: 6,
      limit_reached: false,
    })
    expect(parsed).toEqual({
      gyms: [{ id: 'g1' }],
      pokestops: [],
      stations: [],
      examined: 5,
      skipped: 1,
      total: 6,
      limitReached: false,
    })
  })

  test('missing an entity array throws GolbatMalformedResponseError', () => {
    expect(() => parseFortScanResponse({ gyms: [], pokestops: [] })).toThrow(
      GolbatMalformedResponseError,
    )
  })
})

describe('availability parsers', () => {
  test('parseAvailablePokemon requires a bare array (decoder/api_pokemon.go:9-13)', () => {
    expect(
      parseAvailablePokemon([{ pokemon_id: 1, form: 0, count: 4 }]),
    ).toEqual([{ pokemon_id: 1, form: 0, count: 4 }])
    expect(() => parseAvailablePokemon({})).toThrow(
      GolbatMalformedResponseError,
    )
  })

  test('parseAvailableGyms requires raids (decoder/api_gym_available.go:19-21)', () => {
    const body = { raids: [{ raid_level: 5 }] }
    expect(parseAvailableGyms(body)).toEqual(body)
    expect(() => parseAvailableGyms({})).toThrow(GolbatMalformedResponseError)
  })

  test('parseAvailablePokestops requires quests/invasions/lures/showcases (decoder/api_pokestop_available.go:58-64)', () => {
    const body = {
      showcase_focus_filter: true,
      quests: [],
      invasions: [],
      lures: [],
      showcases: [],
    }
    expect(parseAvailablePokestops(body)).toEqual(body)
    expect(() => parseAvailablePokestops({ quests: [] })).toThrow(
      GolbatMalformedResponseError,
    )
  })

  test('parseAvailableStations requires battles (decoder/api_station_available.go:15-20)', () => {
    const body = { battles: [{ battle_level: 3 }] }
    expect(parseAvailableStations(body)).toEqual(body)
    expect(() => parseAvailableStations({})).toThrow(
      GolbatMalformedResponseError,
    )
  })

  test('parseAvailableForts requires gyms/pokestops/stations objects (decoder/api_fort_available.go:10-14)', () => {
    const body = {
      gyms: { raids: [] },
      pokestops: { quests: [], invasions: [], lures: [], showcases: [] },
      stations: { battles: [] },
    }
    expect(parseAvailableForts(body)).toEqual(body)
    expect(() => parseAvailableForts({ gyms: {} })).toThrow(
      GolbatMalformedResponseError,
    )
  })
})
