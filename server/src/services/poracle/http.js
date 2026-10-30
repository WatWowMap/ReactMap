// @ts-check
const { default: fetch } = require('node-fetch')

const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')

const { setLongTimeout } = require('../../utils/setLongTimeout')

class PoracleRequestError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   */
  constructor(message, status) {
    super(message)
    this.name = 'PoracleRequestError'
    this.status = status
  }
}

/**
 * The most specific message an error body carries: huma problem `detail` plus
 * its `errors[]`, the v1 `{ status, message }` body, else the problem title.
 * @param {any} parsed
 * @param {{ status: number, statusText: string }} response
 * @returns {string}
 */
function errorMessage(parsed, response) {
  const details = Array.isArray(parsed?.errors)
    ? parsed.errors
        .filter((e) => e && e.message)
        .map((e) => (e.location ? `${e.location}: ${e.message}` : e.message))
    : []
  if (parsed?.detail) {
    return details.length
      ? `${parsed.detail}: ${details.join('; ')}`
      : parsed.detail
  }
  if (details.length) return details.join('; ')
  if (typeof parsed?.message === 'string' && parsed.message) {
    return parsed.message
  }
  return parsed?.title || `${response.status} ${response.statusText}`
}

/**
 * @param {{ endpoint: string, secret: string }} options
 */
function createPoracleHttp({ endpoint, secret }) {
  return {
    /**
     * @param {string} path
     * @param {{ method?: string, body?: any }} [options]
     * @returns {Promise<any>}
     */
    async request(path, { method = 'GET', body } = {}) {
      const controller = new AbortController()
      const clear = setLongTimeout(() => {
        controller.abort()
      }, config.getSafe('api.fetchTimeoutMs'))
      try {
        /** @type {Record<string, string>} */
        const headers = { 'X-Poracle-Secret': secret }
        if (body !== undefined) headers['Content-Type'] = 'application/json'
        /** @type {import('node-fetch').Response} */
        let response
        let text = ''
        try {
          response = await fetch(`${endpoint}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: controller.signal,
          })
          text = await response.text()
        } catch (e) {
          // Transport errors carry the internal URL: log it, never return it.
          const timedOut = e?.name === 'AbortError'
          log.warn(
            TAGS.webhooks,
            `Poracle ${method} ${path} ${timedOut ? 'timed out' : 'failed'}:`,
            e?.message,
          )
          throw new PoracleRequestError(
            timedOut
              ? 'Poracle server timed out'
              : 'Poracle server unreachable',
            0,
          )
        }
        /** @type {any} */
        let parsed = {}
        try {
          parsed = text ? JSON.parse(text) : {}
        } catch {
          parsed = {}
        }
        if (!response.ok) {
          throw new PoracleRequestError(
            errorMessage(parsed, response),
            response.status,
          )
        }
        return parsed
      } finally {
        clear()
      }
    },
  }
}

module.exports = { createPoracleHttp, PoracleRequestError }
