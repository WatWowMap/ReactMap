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
 * @property {(status: any) => void} setStatus
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
    setStatus(status) {
      statusBody = status
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
