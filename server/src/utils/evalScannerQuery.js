// @ts-check
const fs = require('fs')
const { resolve } = require('path')

const config = require('@rm/config')
const { log } = require('@rm/logger')
const { fetchJson } = require('./fetchJson')
const { buildScannerHeaders } = require('./scannerHeaders')
const { golbatCapabilities } = require('../services/GolbatCapabilities')

// Validation-class rejections. A Golbat that no longer knows a filter field
// answers one of these, which is the first sign it was downgraded — so the
// capability registry re-reads that instance's /api/status right away.
const CAPABILITY_RECHECK_STATUSES = new Set([400, 422])

/**
 * Endpoint-or-knex query evaluator shared by Golbat-backed scanner models.
 * Mirrors Pokemon.evalQuery / Pokestop.evalQuery but is tag-parameterized so
 * new consumers (Gym, Station) don't each re-copy it.
 * @template T
 * @param {import('@rm/logger').Tag} tag
 * @param {string} mem endpoint base+path when set; falsy = evaluate `query`
 * @param {string | import('objection').QueryBuilder<any>} query JSON body (mem) or knex query
 * @param {'GET' | 'POST' | 'PATCH' | 'DELETE'} [method]
 * @param {string} [secret]
 * @param {{ username: string, password: string } | null} [httpAuth]
 * @returns {Promise<T>}
 */
async function evalScannerQuery(
  tag,
  mem,
  query,
  method = 'POST',
  secret = '',
  httpAuth = null,
) {
  if (config.getSafe('devOptions.queryDebug')) {
    const dir = resolve(__dirname, '../models/queries')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (mem && typeof query === 'string') {
      fs.writeFileSync(resolve(dir, `${Date.now()}.json`), query)
    } else if (typeof query === 'object' && query) {
      fs.writeFileSync(
        resolve(dir, `${Date.now()}.sql`),
        query.toKnexQuery().toString(),
      )
    }
  }
  const results = await (mem
    ? fetchJson(mem, {
        method,
        headers: buildScannerHeaders(secret, httpAuth),
        body: query,
      })
    : query)
  const apiPathIndex = mem ? mem.indexOf('/api/') : -1
  if (
    apiPathIndex > 0 &&
    results &&
    typeof results === 'object' &&
    CAPABILITY_RECHECK_STATUSES.has(results.status)
  ) {
    golbatCapabilities
      .recheck(mem.slice(0, apiPathIndex))
      .catch((e) => log.warn(tag, 'capability recheck failed', e))
  }
  log.debug(tag, 'raw result length', results?.length || 0)
  return results
}

/**
 * Human-readable description of why a scanner endpoint response was not the
 * expected shape, for diagnostic fallback logging. `fetchJson` returns the
 * node-fetch `Response` (with a numeric `status`) on a non-2xx, `undefined` on a
 * network/timeout error, or the parsed JSON on success.
 * @param {any} res
 * @returns {string}
 */
function describeScannerResponse(res) {
  if (res === undefined || res === null) {
    return 'no response (network error / timeout)'
  }
  if (typeof res.status === 'number') {
    return `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''}`
  }
  if (typeof res === 'object') {
    const keys = Object.keys(res)
    return `unexpected body shape (keys: ${keys.length ? keys.join(', ') : 'none'})`
  }
  return `unexpected ${typeof res} response`
}

/**
 * Fetch a single fort by id from a Golbat endpoint (GET) and validate the
 * response looks like a fort record (an object carrying lat/lon). Returns the
 * record or null on a non-fort/unexpected shape. Does NOT catch — the caller
 * decides whether to swallow (manual-id miss mirrors an empty SQL lookup) or
 * log and fall back to SQL (getOne).
 *
 * @param {import('@rm/logger').Tag} tag
 * @param {string} url endpoint base + `/api/<type>/id/<id>`
 * @param {string} [secret]
 * @param {{ username: string, password: string } | null} [httpAuth]
 * @returns {Promise<object | null>}
 */
async function fetchFortById(tag, url, secret, httpAuth) {
  const one = await evalScannerQuery(
    tag,
    url,
    undefined,
    'GET',
    secret,
    httpAuth,
  )
  return one && typeof one === 'object' && 'lat' in one && 'lon' in one
    ? one
    : null
}

module.exports = { evalScannerQuery, describeScannerResponse, fetchFortById }
