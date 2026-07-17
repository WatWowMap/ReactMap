// @ts-check
const { log, TAGS } = require('@rm/logger')
const {
  evalScannerQuery,
  describeScannerResponse,
} = require('./evalScannerQuery')

/**
 * The three fort models refresh availability together (session-init and the
 * scheduled intervals fire them as a batch), and on Golbat each per-type
 * /available call walks the ENTIRE fort cache. Share one combined
 * GET /api/fort/available per endpoint within a short window so a refresh
 * batch costs one cache pass instead of three.
 */
const CACHE_MS = 30_000

/** @type {Map<string, { ts: number, promise: Promise<object | null> }>} */
const combinedCache = new Map()

/**
 * Fetches the combined fort availability, deduped per endpoint per window.
 * Resolves null when the combined endpoint is unavailable (older Golbat or
 * fort_in_memory off) — callers fall back to their per-type endpoint. The
 * null is cached for the same window so an old Golbat isn't hammered.
 *
 * @param {import('@rm/logger').Tag} tag
 * @param {string} mem endpoint base url
 * @param {string} [secret]
 * @param {{ username: string, password: string } | null} [httpAuth]
 * @returns {Promise<{ pokestops: object, gyms: object, stations: object } | null>}
 */
function getCombinedFortAvailable(tag, mem, secret, httpAuth) {
  const entry = combinedCache.get(mem)
  if (entry && Date.now() - entry.ts < CACHE_MS) return entry.promise
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
        log.info(
          TAGS.gyms,
          `[FORT] combined ${mem}/api/fort/available OK — one pass for all three types`,
        )
        return res
      }
      log.warn(
        TAGS.gyms,
        `[FORT] combined ${mem}/api/fort/available unusable — ${describeScannerResponse(res)} — falling back to per-type`,
      )
    } catch (e) {
      log.warn(
        TAGS.gyms,
        `[FORT] combined ${mem}/api/fort/available error — falling back to per-type: ${e}`,
      )
    }
    return null
  })()
  combinedCache.set(mem, { ts: Date.now(), promise })
  return promise
}

module.exports = { getCombinedFortAvailable }
