// server/acceptance/support/fake-golbat-server.js
//
// A small stand-in for Golbat, used only by server/acceptance/transport.acceptance.js.
// This is the "run a fake Golbat" option from the Transport plan's Task 1 brief: it
// speaks the real v3 pokemon scan, combined fort scan and status response shapes, taken
// directly from Golbat's Go source (cited per endpoint below), so the acceptance suite
// exercises everything ReactMap does with a real-shaped Golbat response -- including
// `limit_reached` truncation and the verified/unverified expiry distinction. It does NOT
// prove ReactMap calls a *real* Golbat correctly (request shape, auth header, network
// failure handling); there is no Golbat reachable in this environment to check that
// against. See the acceptance file's header comment for the full reasoning.
//
// Every response shape below is a direct transcription of a Golbat struct. Fields this
// suite never asserts on are still included with correct zero values, so a response body
// this fixture returns really could have come from Golbat's JSON encoder.

/**
 * @typedef {object} FakeGolbat
 * @property {string} url
 * @property {(fn: (body: any) => any) => void} setPokemonHandler
 * @property {(fn: (body: any) => any) => void} setFortHandler
 * @property {(fn: () => any) => void} setAvailablePokemonHandler
 * @property {(fn: () => any) => void} setAvailableGymsHandler
 * @property {(fn: () => any) => void} setAvailablePokestopsHandler
 * @property {(fn: () => any) => void} setAvailableStationsHandler
 * @property {(fn: () => any) => void} setAvailableFortsHandler
 * @property {(status: any) => void} setStatus
 * @property {(secret: string | null) => void} setSecret
 * @property {() => Array<{path: string, body: any, at: number}>} getRequestLog
 * @property {() => void} resetRequestLog
 * @property {() => void} close
 */

/**
 * @returns {FakeGolbat}
 */
function startFakeGolbat() {
  /** @type {Array<{path: string, body: any, at: number}>} */
  const requestLog = []

  // Defaults: an empty world. Every criterion overrides these per-test via
  // setPokemonHandler/setFortHandler before opening a socket.
  let pokemonHandler = () => ({
    // decoder/api_pokemon_response.go:167-175 (ApiPokemonScanResultV3): the
    // v3 envelope. `limit_reached` is what reconciliation must respect.
    pokemon: [],
    examined: 0,
    skipped: 0,
    total: 0,
    limit_reached: false,
  })

  let fortHandler = () => ({
    // decoder/api_fort.go:150-158 (ApiFortCombinedScanResult).
    gyms: [],
    pokestops: [],
    stations: [],
    examined: 0,
    skipped: 0,
    total: 0,
    limit_reached: false,
  })

  let statusBody = {
    // decoder/api_status.go:11-19 (ApiStatusResult).
    features: { fort_in_memory: true },
    limits: { max_pokemon_results: 3000, max_fort_results: 9000 },
  }

  // routes_huma.go:140-142 (pokemonAvailableOutput) -- bare array, NOT
  // gated by fort_in_memory (registerPokemonReadRoutes has no such check).
  let availablePokemonHandler = () => []

  // decoder/api_gym_available.go:19-21 (ApiAvailableGyms). Gated.
  let availableGymsHandler = () => ({ raids: [] })

  // decoder/api_pokestop_available.go:58-64 (ApiAvailablePokestops). Gated.
  let availablePokestopsHandler = () => ({
    showcase_focus_filter: true,
    quests: [],
    invasions: [],
    lures: [],
    showcases: [],
  })

  // decoder/api_station_available.go:15-20 (ApiAvailableStations). Gated.
  let availableStationsHandler = () => ({ battles: [] })

  // decoder/api_fort_available.go:10-14 (ApiAvailableForts). Gated.
  let availableFortsHandler = () => ({
    pokestops: availablePokestopsHandler(),
    gyms: availableGymsHandler(),
    stations: availableStationsHandler(),
  })

  // routes.go:430-432 / huma_api.go:59-77 -- X-Golbat-Secret shared secret.
  // `null` (the default) matches Golbat's own "ApiSecret == ''" behavior:
  // auth is disabled entirely, so no header is required.
  /** @type {string | null} */
  let secret = null

  // routes_huma.go:174-323 (registerFortScanRoutes): every handler in this
  // set checks config.Config.FortInMemory first and 503s when it's false.
  const fortInMemoryGatedPaths = new Set([
    '/api/fort/scan',
    '/api/gym/available',
    '/api/pokestop/available',
    '/api/station/available',
    '/api/fort/available',
  ])

  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const url = new URL(request.url)
      let body
      if (request.method === 'POST') {
        const text = await request.text()
        body = text ? JSON.parse(text) : {}
      }
      requestLog.push({ path: url.pathname, body, at: Date.now() })

      if (
        secret !== null &&
        request.headers.get('X-Golbat-Secret') !== secret
      ) {
        return new Response('invalid or missing X-Golbat-Secret', {
          status: 401,
        })
      }

      if (
        fortInMemoryGatedPaths.has(url.pathname) &&
        !statusBody?.features?.fort_in_memory
      ) {
        return new Response('fort_in_memory not enabled', { status: 503 })
      }

      // decoder api_pokemon_scan_v3.go / routes_huma.go:53 -- POST /api/pokemon/v3/scan
      if (
        url.pathname === '/api/pokemon/v3/scan' &&
        request.method === 'POST'
      ) {
        return Response.json(pokemonHandler(body))
      }

      // decoder api_fort.go / routes_huma.go:236 -- POST /api/fort/scan
      if (url.pathname === '/api/fort/scan' && request.method === 'POST') {
        return Response.json(fortHandler(body))
      }

      // routes_huma.go:72 -- GET /api/status
      if (url.pathname === '/api/status' && request.method === 'GET') {
        return Response.json(statusBody)
      }

      // routes_huma.go:128-131 -- GET /api/pokemon/available
      if (
        url.pathname === '/api/pokemon/available' &&
        request.method === 'GET'
      ) {
        return Response.json(availablePokemonHandler())
      }

      // routes_huma.go:270-284 -- GET /api/gym/available
      if (url.pathname === '/api/gym/available' && request.method === 'GET') {
        return Response.json(availableGymsHandler())
      }

      // routes_huma.go:251-267 -- GET /api/pokestop/available
      if (
        url.pathname === '/api/pokestop/available' &&
        request.method === 'GET'
      ) {
        return Response.json(availablePokestopsHandler())
      }

      // routes_huma.go:306-320 -- GET /api/station/available
      if (
        url.pathname === '/api/station/available' &&
        request.method === 'GET'
      ) {
        return Response.json(availableStationsHandler())
      }

      // routes_huma.go:288-303 -- GET /api/fort/available
      if (url.pathname === '/api/fort/available' && request.method === 'GET') {
        return Response.json(availableFortsHandler())
      }

      return new Response('not found in fake golbat', { status: 404 })
    },
  })

  return {
    url: `http://127.0.0.1:${server.port}`,
    setPokemonHandler(fn) {
      pokemonHandler = fn
    },
    setFortHandler(fn) {
      fortHandler = fn
    },
    setAvailablePokemonHandler(fn) {
      availablePokemonHandler = fn
    },
    setAvailableGymsHandler(fn) {
      availableGymsHandler = fn
    },
    setAvailablePokestopsHandler(fn) {
      availablePokestopsHandler = fn
    },
    setAvailableStationsHandler(fn) {
      availableStationsHandler = fn
    },
    setAvailableFortsHandler(fn) {
      availableFortsHandler = fn
    },
    setStatus(status) {
      statusBody = status
    },
    setSecret(value) {
      secret = value
    },
    getRequestLog() {
      return requestLog
    },
    resetRequestLog() {
      requestLog.length = 0
    },
    close() {
      server.stop(true)
    },
  }
}

module.exports = { startFakeGolbat }
