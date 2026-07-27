// @ts-check
const config = require('@rm/config')
const { log } = require('@rm/logger')
const {
  evalScannerQuery,
  describeScannerResponse,
} = require('./evalScannerQuery')

/**
 * The three fort models refresh availability together (session-init and the
 * scheduled intervals fire them as a batch), and on Golbat each per-type
 * /available call walks the ENTIRE fort cache. Share one combined
 * GET /api/fort/available per endpoint within a short window so a refresh
 * batch costs one cache pass instead of three. The window tracks
 * api.availableRefreshSeconds so it never floors a shorter configured throttle;
 * a forced refresh (config reload / PUT /api/v1/available) busts the cache so it
 * starts a fresh generation (see bustCombinedFortCache).
 */
const cacheMs = () =>
  (config.getSafe('api.availableRefreshSeconds') || 60) * 1000

/** @type {Map<string, { ts: number, promise: Promise<object | null> }>} */
const combinedCache = new Map()

/**
 * Drop all cached snapshots so the next fetch starts a fresh generation. Called
 * before a forced refresh; the concurrent fort batch that follows still shares
 * one Golbat request via the repopulated entry's window.
 */
function bustCombinedFortCache() {
  combinedCache.clear()
}

/**
 * Cache key = endpoint URL AND credentials. Two sources can point at the same
 * Golbat URL with different secret/httpAuth; keying on `mem` alone would let one
 * source serve another its response — or, worse, cache one source's auth
 * failure (a null) for the other for the whole window.
 * @param {string} mem
 * @param {string} [secret]
 * @param {{ username: string, password: string } | null} [httpAuth]
 */
function cacheKeyFor(mem, secret, httpAuth) {
  const auth = httpAuth ? `${httpAuth.username}:${httpAuth.password}` : ''
  return `${mem}\0${secret || ''}\0${auth}`
}

/**
 * Fetches the combined fort availability, deduped per endpoint per window.
 * Resolves null when the combined endpoint is unavailable (older Golbat or
 * fort_in_memory off) — callers then fall through to their SQL path (or an
 * empty result for a pure-endpoint source). The null is cached for the same
 * window so an old Golbat isn't hammered.
 *
 * @param {import('@rm/logger').Tag} tag
 * @param {string} mem endpoint base url
 * @param {string} [secret]
 * @param {{ username: string, password: string } | null} [httpAuth]
 * @returns {Promise<{ pokestops: object, gyms: object, stations: object } | null>}
 */
function getCombinedFortAvailable(tag, mem, secret, httpAuth) {
  const cacheKey = cacheKeyFor(mem, secret, httpAuth)
  const entry = combinedCache.get(cacheKey)
  if (entry && Date.now() - entry.ts < cacheMs()) return entry.promise
  const promise = (async () => {
    try {
      const res = await evalScannerQuery(
        tag,
        `${mem}/api/fort/available`,
        undefined,
        'GET',
        secret,
        httpAuth,
      )
      if (
        res &&
        typeof res === 'object' &&
        res.pokestops &&
        res.gyms &&
        res.stations
      ) {
        return res
      }
      log.warn(
        tag,
        `[FORT] combined ${mem}/api/fort/available unusable — ${describeScannerResponse(res)} — callers fall through to SQL`,
      )
    } catch (e) {
      log.warn(
        tag,
        `[FORT] combined ${mem}/api/fort/available error — callers fall through to SQL: ${e}`,
      )
    }
    return null
  })()
  combinedCache.set(cacheKey, { ts: Date.now(), promise })
  return promise
}

module.exports = { getCombinedFortAvailable, bustCombinedFortCache }
