// server/src/services/golbat-client.ts
//
// A fresh Golbat client for the endpoints 2.0 uses:
//   - POST /api/pokemon/v3/scan
//   - POST /api/fort/scan (the combined gym+pokestop+station scan)
//   - GET  /api/status
//   - GET  /api/pokemon/available, /api/gym/available,
//     /api/pokestop/available, /api/station/available, /api/fort/available
//
// This is the thin fetching adapter around the pure builders/parsers in
// `golbat-requests.js`/`golbat-responses.js`: it owns the network call, the
// auth header, the timeout, and capability caching. It does not import,
// call, or adapt any 1.x code -- every wire shape here is cited to Golbat
// source in the two sibling files.
//
// Nothing on this branch calls `createGolbatClient` yet (Tasks 3 and 4
// build on it); this module is exercised directly by
// `server/test/golbat-client.test.js`.

import config from '@rm/config'
import { log, TAGS } from '@rm/logger'

import { buildFortScanBody, buildPokemonScanBody } from './golbat-requests'
import {
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
} from './golbat-responses'

const DEFAULT_TIMEOUT_MS = 10_000

function assertFortInMemoryLocally(
  capabilities: { fortInMemory: boolean } | null,
  path: string,
) {
  if (capabilities && !capabilities.fortInMemory) {
    throw new GolbatUnavailableError(
      `${path}: fort_in_memory is disabled on this Golbat (known from a prior GET /api/status), refusing to send the request`,
      { local: true },
    )
  }
}

/**
 * Creates a Golbat API client.
 *
 * Failure modes, and what this client does with each (see the transport
 * plan Task 2 brief for why these were the choices):
 *   - Unreachable Golbat (connection refused/DNS/etc) -> rejects with
 *     `GolbatUnreachableError`. No retry: this client sits on the hot path
 *     of every map view, so retrying here would only add latency to an
 *     already-failed call. A poller (Task 4/5) retries for free on its next
 *     cycle.
 *   - Timeout -> rejects with `GolbatTimeoutError` after `timeoutMs`
 *     (default 10s). Every request carries an `AbortController` so a slow
 *     Golbat can never hang this client indefinitely.
 *   - 401 -> rejects with `GolbatUnauthorizedError`. Not retried (a wrong
 *     secret does not fix itself); the caller should surface this loudly,
 *     since it means every subsequent call will also fail.
 *   - 503 from a `fort_in_memory`-gated endpoint -> rejects with
 *     `GolbatUnavailableError`. If capabilities were already read via
 *     `init()`/`getStatus()` and reported `fort_in_memory: false`, the
 *     gated methods below refuse locally (`error.local === true`) without
 *     making the network call at all, per the brief's "must know this
 *     without taking a 503 to find out."
 *   - Malformed body (bad JSON, or missing fields a parser requires) ->
 *     rejects with `GolbatMalformedResponseError`. This is the one failure
 *     mode that is a Golbat bug rather than a network condition, and is
 *     kept distinct so a caller can log it differently.
 *   - Any other non-2xx status -> rejects with `GolbatHttpError` carrying
 *     the status code.
 * Every failure is a rejected promise from an `async` method, never a
 * thrown synchronous exception or a silently swallowed error -- callers
 * decide how to handle it, but nothing here can become an unhandled
 * rejection on its own or hang past `timeoutMs`.
 *
 * @param options Every field overrides its `config`-backed default; intended
 *   for tests to inject a fake `fetchImpl` and skip `@rm/config` entirely.
 */
function createGolbatClient(
  options: {
    apiUrl?: string
    apiSecret?: string
    // A minimal fetch-shaped callable, not `typeof fetch` -- Bun's real
    // `fetch` type also carries static members (`fetch.preconnect`) that a
    // test's plain `async (url, init) => new Response(...)` fake has no
    // reason to implement.
    fetchImpl?: (
      input: string | URL | Request,
      init?: RequestInit,
    ) => Promise<Response>
    timeoutMs?: number
  } = {},
) {
  const apiUrl = options.apiUrl ?? config.getSafe('golbat.apiUrl') ?? ''
  const apiSecret =
    options.apiSecret ?? config.getSafe('golbat.apiSecret') ?? ''
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  if (!apiSecret) {
    log.warn(
      TAGS.fetch,
      'GOLBAT_API_SECRET is not set; requests will omit X-Golbat-Secret. ' +
        'This is only safe when Golbat itself has no api_secret configured -- ' +
        "an empty secret disables auth entirely on Golbat's side (routes.go:430-432).",
    )
  }

  let capabilities: {
    fortInMemory: boolean
    maxPokemonResults: number
    maxFortResults: number
  } | null = null

  async function request(
    path: string,
    { method = 'GET', body }: { method?: string; body?: object } = {},
  ) {
    if (!apiUrl) {
      throw new GolbatUnreachableError(
        `Golbat apiUrl is not configured (golbat.apiUrl / GOLBAT_API_URL); cannot ${method} ${path}`,
      )
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let response: Response
    try {
      response = await fetchImpl(`${apiUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(apiSecret ? { 'X-Golbat-Secret': apiSecret } : {}),
        },
        body: body === undefined ? null : JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        throw new GolbatTimeoutError(
          `Golbat ${method} ${path} did not respond within ${timeoutMs}ms`,
        )
      }
      throw new GolbatUnreachableError(
        `Golbat ${method} ${path} unreachable: ${e?.message || e}`,
      )
    } finally {
      clearTimeout(timer)
    }

    if (response.status === 401) {
      throw new GolbatUnauthorizedError(
        `Golbat rejected X-Golbat-Secret for ${method} ${path}`,
      )
    }
    if (response.status === 503) {
      throw new GolbatUnavailableError(
        `Golbat ${method} ${path} returned 503 (fort_in_memory is likely disabled)`,
      )
    }
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new GolbatHttpError(
        response.status,
        `Golbat ${method} ${path} returned ${response.status}: ${text}`,
      )
    }

    const text = await response.text()
    if (!text) return undefined
    try {
      return JSON.parse(text)
    } catch {
      throw new GolbatMalformedResponseError(
        `Golbat ${method} ${path} returned a body that is not valid JSON`,
      )
    }
  }

  return {
    /**
     * Reads `GET /api/status` once and caches the result -- this is the
     * "read caps and fort_in_memory at boot" call the brief describes.
     * Safe to call again later to refresh (e.g. after Golbat restarts with
     * different tuning); every call replaces the cached value.
     */
    async init() {
      capabilities = parseStatus(await request('/api/status'))
      return capabilities
    },

    /** Alias for `init()`, for a caller that wants "status" framing instead of "boot" framing. */
    async getStatus() {
      capabilities = parseStatus(await request('/api/status'))
      return capabilities
    },

    /** The cached capabilities from the last `init()`/`getStatus()` call, or `null` if neither has run yet. */
    getCapabilities() {
      return capabilities
    },

    /** `true`/`false` once known, `null` if `init()`/`getStatus()` has not run yet -- never guesses. */
    isFortInMemoryEnabled() {
      return capabilities ? capabilities.fortInMemory : null
    },

    /** Whether this client will send `X-Golbat-Secret` at all. */
    isSecretConfigured() {
      return Boolean(apiSecret)
    },

    async scanPokemon(params: {
      min: { lat: number; lon: number }
      max: { lat: number; lon: number }
      limit?: number
      filters?: object[]
    }) {
      const body = buildPokemonScanBody(params, capabilities)
      return parsePokemonScanResponse(
        await request('/api/pokemon/v3/scan', { method: 'POST', body }),
      )
    },

    async scanForts(params: {
      min: { lat: number; lon: number }
      max: { lat: number; lon: number }
      limit?: number
      withIncidents?: boolean
      gyms?: { filters?: object[] } | null
      pokestops?: { filters?: object[] } | null
      stations?: { filters?: object[] } | null
    }) {
      assertFortInMemoryLocally(capabilities, 'POST /api/fort/scan')
      const body = buildFortScanBody(params, capabilities)
      return parseFortScanResponse(
        await request('/api/fort/scan', { method: 'POST', body }),
      )
    },

    /** Not gated by fort_in_memory. */
    async getAvailablePokemon() {
      return parseAvailablePokemon(await request('/api/pokemon/available'))
    },

    async getAvailableGyms() {
      assertFortInMemoryLocally(capabilities, 'GET /api/gym/available')
      return parseAvailableGyms(await request('/api/gym/available'))
    },

    async getAvailablePokestops() {
      assertFortInMemoryLocally(capabilities, 'GET /api/pokestop/available')
      return parseAvailablePokestops(await request('/api/pokestop/available'))
    },

    async getAvailableStations() {
      assertFortInMemoryLocally(capabilities, 'GET /api/station/available')
      return parseAvailableStations(await request('/api/station/available'))
    },

    async getAvailableForts() {
      assertFortInMemoryLocally(capabilities, 'GET /api/fort/available')
      return parseAvailableForts(await request('/api/fort/available'))
    },
  }
}

export { createGolbatClient }
