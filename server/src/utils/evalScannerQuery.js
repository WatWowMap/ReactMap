// @ts-check
const fs = require('fs')
const { resolve } = require('path')

const config = require('@rm/config')
const { log } = require('@rm/logger')
const { fetchJson } = require('./fetchJson')

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
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(secret ? { 'X-Golbat-Secret': secret } : {}),
          ...(httpAuth
            ? {
                Authorization: `Basic ${Buffer.from(
                  `${httpAuth.username}:${httpAuth.password}`,
                ).toString('base64')}`,
              }
            : {}),
        },
        body: query,
      })
    : query)
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

module.exports = { evalScannerQuery, describeScannerResponse }
