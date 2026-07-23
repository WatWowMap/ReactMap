// @ts-check
const fs = require('fs')
const { resolve } = require('path')

const { default: fetch, Response } = require('node-fetch')

const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')

const { setLongTimeout } = require('./setLongTimeout')

const REDACTED_HEADERS = new Set(['authorization', 'x-golbat-secret'])

/**
 * Returns a shallow copy of the fetch options with credential headers masked,
 * so debug logs and the failed-request payload dump never persist the
 * X-Golbat-Secret or Basic auth to disk.
 * @param {import('node-fetch').RequestInit} [options]
 */
function redactOptions(options) {
  const headers = options && /** @type {any} */ (options).headers
  if (!headers || typeof headers !== 'object') return options
  return {
    ...options,
    headers: Object.fromEntries(
      Object.entries(headers).map(([k, v]) =>
        REDACTED_HEADERS.has(k.toLowerCase()) ? [k, '<redacted>'] : [k, v],
      ),
    ),
  }
}

/**
 * fetch wrapper with timeout and error handling
 * @param {string} url
 * @param {import('node-fetch').RequestInit} [options]
 * @returns
 */
async function fetchJson(url, options = undefined) {
  const controller = new AbortController()

  const clearFetchTimeout = setLongTimeout(() => {
    controller.abort()
  }, config.getSafe('api.fetchTimeoutMs'))

  try {
    log.debug(TAGS.fetch, url, options ? redactOptions(options) : '')
    const response = await fetch(url, { ...options, signal: controller.signal })
    if (!response.ok) {
      throw new Error(`${response.status} (${response.statusText})`, {
        cause: response,
      })
    }
    return response.json()
  } catch (e) {
    if (e instanceof Error) {
      if (
        e.cause instanceof Response &&
        e.cause.status === 404 &&
        url.includes('/api/pokemon/id')
      )
        return e.cause
      log.error(TAGS.fetch, `Unable to fetch ${url}`, '\n', e)
      if (options) {
        try {
          const logsDir = resolve(__dirname, '../../../logs')
          const fileName = `${url.replaceAll(/[^a-zA-Z0-9._-]/g, '_')}${Math.floor(Date.now() / 1000)}.json`
          fs.mkdirSync(logsDir, { recursive: true })
          fs.writeFileSync(
            resolve(logsDir, fileName),
            JSON.stringify(redactOptions(options), null, 2),
          )
        } catch (writeError) {
          log.warn(
            TAGS.fetch,
            'Unable to write failed request payload log',
            '\n',
            writeError,
          )
        }
      }
      return e.cause
    }
  } finally {
    clearFetchTimeout()
  }
}

module.exports = { fetchJson }
