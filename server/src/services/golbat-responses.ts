// server/src/services/golbat-responses.ts
//
// Pure response-parsing functions and the typed error hierarchy for
// Golbat's HTTP API. No network -- these take an already-decoded JSON value
// (or throw a malformed-response error) and return a plain object. Entity
// arrays (pokemon/gym/pokestop/station rows) are passed through verbatim in
// Golbat's own field names rather than reshaped: nothing on this branch
// consumes them yet, and inventing a projection here would be a guess this
// task has no caller to validate against.
//
// Shapes cited directly from Golbat source (/Users/rin/GitHub/Golbat):
//   - GET /api/status: decoder/api_status.go:11-19 (ApiStatusResult).
//   - POST /api/pokemon/v3/scan response envelope:
//     decoder/api_pokemon_response.go:167-175 (ApiPokemonScanResultV3).
//     `limit_reached` is the only signal a response was truncated --
//     reconciliation (Task 4) depends on this field surviving parsing.
//   - POST /api/fort/scan response envelope: decoder/api_fort.go:150-158
//     (ApiFortCombinedScanResult).
//   - GET /api/pokemon/available: decoder/api_pokemon.go:9-13
//     (ApiPokemonAvailableResult), returned as a bare array
//     (routes_huma.go:140-142, pokemonAvailableOutput). Not gated by
//     fort_in_memory (registerPokemonReadRoutes has no such check).
//   - GET /api/gym/available: decoder/api_gym_available.go:19-21
//     (ApiAvailableGyms, `{raids: [...]}`).
//   - GET /api/pokestop/available: decoder/api_pokestop_available.go:58-64
//     (ApiAvailablePokestops, `{showcase_focus_filter, quests, invasions,
//     lures, showcases}`).
//   - GET /api/station/available: decoder/api_station_available.go:15-20
//     (ApiAvailableStations, `{battles: [...]}`).
//   - GET /api/fort/available: decoder/api_fort_available.go:10-14
//     (ApiAvailableForts, `{pokestops, gyms, stations}`, each the same
//     shape as its per-type endpoint).
//   - Gated-by-`fort_in_memory` set (8 endpoints): the four fort scans
//     (gym/pokestop/station/fort) and their four `/available` counterparts
//     (routes_huma.go:174-323, registerFortScanRoutes -- every handler in
//     it checks `config.Config.FortInMemory` first). Pokemon scan/available
//     and by-id/query reads are NOT gated (decoder/api_status.go:14 doc
//     comment: "By-id and query endpoints do not depend on it").
//   - Auth: routes.go:430-432 / huma_api.go:59-77 -- a single shared secret
//     in `X-Golbat-Secret`, checked against `config.Config.ApiSecret`. An
//     empty configured secret on Golbat's side means `ctx.Header(...) !=
//     ""` is only false (i.e. auth passes) when no header was sent either,
//     so Golbat disables auth entirely when its own secret is empty.

class GolbatError extends Error {}

/** Golbat could not be reached at all (DNS/connection refused/etc), or no apiUrl is configured. */
class GolbatUnreachableError extends GolbatError {}

/** The request did not complete within the client's timeout. */
class GolbatTimeoutError extends GolbatError {}

/** Golbat returned 401: `X-Golbat-Secret` was missing or wrong. */
class GolbatUnauthorizedError extends GolbatError {}

/**
 * Golbat returned 503 for one of the eight `fort_in_memory`-gated
 * endpoints, or (when `local: true`) the client refused to send the request
 * at all because it already knows `fort_in_memory` is disabled from a prior
 * `GET /api/status` read.
 */
class GolbatUnavailableError extends GolbatError {
  local: boolean

  constructor(message: string, { local = false }: { local?: boolean } = {}) {
    super(message)
    this.local = local
  }
}

/** Any other non-2xx HTTP status. */
class GolbatHttpError extends GolbatError {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** The response body was not valid JSON, or was missing fields this parser requires. */
class GolbatMalformedResponseError extends GolbatError {}

function parseStatus(json: any): {
  fortInMemory: boolean
  maxPokemonResults: number
  maxFortResults: number
} {
  if (!json || typeof json !== 'object' || !json.features || !json.limits) {
    throw new GolbatMalformedResponseError(
      'GET /api/status: response is missing features/limits',
    )
  }
  return {
    fortInMemory: Boolean(json.features.fort_in_memory),
    maxPokemonResults: Number(json.limits.max_pokemon_results) || 0,
    maxFortResults: Number(json.limits.max_fort_results) || 0,
  }
}

function parsePokemonScanResponse(json: any): {
  pokemon: object[]
  examined: number
  skipped: number
  total: number
  limitReached: boolean
} {
  if (!json || !Array.isArray(json.pokemon)) {
    throw new GolbatMalformedResponseError(
      'POST /api/pokemon/v3/scan: response is missing a pokemon array',
    )
  }
  return {
    pokemon: json.pokemon,
    examined: Number(json.examined) || 0,
    skipped: Number(json.skipped) || 0,
    total: Number(json.total) || 0,
    limitReached: Boolean(json.limit_reached),
  }
}

function parseFortScanResponse(json: any): {
  gyms: object[]
  pokestops: object[]
  stations: object[]
  examined: number
  skipped: number
  total: number
  limitReached: boolean
} {
  if (
    !json ||
    !Array.isArray(json.gyms) ||
    !Array.isArray(json.pokestops) ||
    !Array.isArray(json.stations)
  ) {
    throw new GolbatMalformedResponseError(
      'POST /api/fort/scan: response is missing gyms/pokestops/stations arrays',
    )
  }
  return {
    gyms: json.gyms,
    pokestops: json.pokestops,
    stations: json.stations,
    examined: Number(json.examined) || 0,
    skipped: Number(json.skipped) || 0,
    total: Number(json.total) || 0,
    limitReached: Boolean(json.limit_reached),
  }
}

function parseAvailablePokemon(json: any): object[] {
  if (!Array.isArray(json)) {
    throw new GolbatMalformedResponseError(
      'GET /api/pokemon/available: response is not an array',
    )
  }
  return json
}

function parseAvailableGyms(json: any): { raids: object[] } {
  if (!json || !Array.isArray(json.raids)) {
    throw new GolbatMalformedResponseError(
      'GET /api/gym/available: response is missing a raids array',
    )
  }
  return json
}

function parseAvailablePokestops(json: any): {
  showcase_focus_filter: boolean
  quests: object[]
  invasions: object[]
  lures: object[]
  showcases: object[]
} {
  if (
    !json ||
    !Array.isArray(json.quests) ||
    !Array.isArray(json.invasions) ||
    !Array.isArray(json.lures) ||
    !Array.isArray(json.showcases)
  ) {
    throw new GolbatMalformedResponseError(
      'GET /api/pokestop/available: response is missing quests/invasions/lures/showcases arrays',
    )
  }
  return json
}

function parseAvailableStations(json: any): { battles: object[] } {
  if (!json || !Array.isArray(json.battles)) {
    throw new GolbatMalformedResponseError(
      'GET /api/station/available: response is missing a battles array',
    )
  }
  return json
}

function parseAvailableForts(json: any): {
  gyms: object
  pokestops: object
  stations: object
} {
  if (
    !json ||
    typeof json.gyms !== 'object' ||
    typeof json.pokestops !== 'object' ||
    typeof json.stations !== 'object'
  ) {
    throw new GolbatMalformedResponseError(
      'GET /api/fort/available: response is missing gyms/pokestops/stations objects',
    )
  }
  return json
}

export {
  GolbatError,
  GolbatHttpError,
  GolbatMalformedResponseError,
  GolbatTimeoutError,
  GolbatUnauthorizedError,
  GolbatUnavailableError,
  GolbatUnreachableError,
  parseAvailableForts,
  parseAvailableGyms,
  parseAvailablePokemon,
  parseAvailablePokestops,
  parseAvailableStations,
  parseFortScanResponse,
  parsePokemonScanResponse,
  parseStatus,
}
