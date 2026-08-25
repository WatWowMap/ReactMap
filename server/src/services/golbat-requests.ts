// server/src/services/golbat-requests.ts
//
// Pure request-building functions for Golbat's HTTP API. No network, no
// config reads -- everything a caller needs comes in as an argument, so
// these can be unit tested without a server. `golbat-client.js` is the thin
// fetching adapter that calls these and sends the result.
//
// Shapes cited directly from Golbat source (/Users/rin/GitHub/Golbat):
//   - POST /api/pokemon/v3/scan body: decoder/api_pokemon_scan_v3.go:12-17
//     (ApiPokemonScan3) and :31-41 (ApiPokemonDnfFilter3). `gender` is an
//     explicit array (line 39), unlike v2's min/max range -- this is the
//     reason 2.0 calls v3 at all (see the transport plan's Task 2 brief).
//   - POST /api/fort/scan body: decoder/api_fort.go:33-42
//     (ApiFortCombinedScan). Each of `gyms`/`pokestops`/`stations` is an
//     independent `*ApiFortTypeScanGroup` (decoder/api_fort.go:23-27):
//     omitted/null EXCLUDES that fort type from the combined result, unless
//     ALL THREE are omitted, which is documented as a "legacy bare-probe"
//     that matches every type (decoder/api_fort.go:55-59,
//     `combinedFortMatches`). Callers of `buildFortScanBody` must pass a
//     group (even `{ filters: [] }`, which matches every fort of that type)
//     for every fort type they want back.

/**
 * Clamps a requested result limit to a server-reported cap. Golbat's own
 * `fortScanLimit`/`pokemonScanLimit` (decoder/api_fort.go:243-250,
 * decoder/api_pokemon_common.go) only ever narrow the effective limit --
 * requesting more than the cap cannot raise it -- so there is no reason to
 * ever send a number the server would silently reduce anyway. `0` is
 * Golbat's own "use the server default" sentinel (see the `Limit` field docs
 * on both request structs), which is already at or under the cap, so a
 * missing/zero/negative request is left as `0` rather than replaced with the
 * cap value.
 *
 */
function clampLimit(
  requested: number | null | undefined,
  cap: number | null | undefined,
): number {
  const n = Number(requested) || 0
  if (n <= 0) return 0
  if (!cap || cap <= 0) return n
  return Math.min(n, cap)
}

/**
 * Builds the body for `POST /api/pokemon/v3/scan`.
 * decoder/api_pokemon_scan_v3.go:12-17 (ApiPokemonScan3).
 *
 * @param caps Capabilities read from `GET /api/status`; omit or pass `null`
 *   if not yet known (the request is still sent, and Golbat clamps
 *   server-side).
 */
function buildPokemonScanBody(
  {
    min,
    max,
    limit,
    filters,
  }: {
    min: { lat: number; lon: number }
    max: { lat: number; lon: number }
    limit?: number
    filters?: object[]
  },
  caps: { maxPokemonResults?: number } | null | undefined,
) {
  return {
    min,
    max,
    limit: clampLimit(limit, caps?.maxPokemonResults),
    // decoder/api_pokemon_common.go:130-146: an empty/omitted `filters`
    // array matches NOTHING, not everything -- there is no wildcard clause.
    // Passed through as-is rather than defaulted, so that behavior is the
    // caller's explicit choice, not this function's guess.
    filters: filters ?? [],
  }
}

/**
 * Builds the body for `POST /api/fort/scan`, the combined scan covering
 * gyms, pokestops and stations in one spatial traversal.
 * decoder/api_fort.go:33-42 (ApiFortCombinedScan).
 *
 * @param params Each of `gyms`/`pokestops`/`stations` opts that fort type
 *   into the result; omitting one (leaving it `undefined`/`null`) excludes
 *   it, per decoder/api_fort.go:55-59.
 */
function buildFortScanBody(
  {
    min,
    max,
    limit,
    withIncidents,
    gyms,
    pokestops,
    stations,
  }: {
    min: { lat: number; lon: number }
    max: { lat: number; lon: number }
    limit?: number
    withIncidents?: boolean
    gyms?: { filters?: object[] } | null
    pokestops?: { filters?: object[] } | null
    stations?: { filters?: object[] } | null
  },
  caps: { maxFortResults?: number } | null | undefined,
) {
  return {
    min,
    max,
    limit: clampLimit(limit, caps?.maxFortResults),
    with_incidents: Boolean(withIncidents),
    gyms: gyms ?? null,
    pokestops: pokestops ?? null,
    stations: stations ?? null,
  }
}

export { buildFortScanBody, buildPokemonScanBody, clampLimit }
