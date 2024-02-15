// @ts-check
const fs = require('fs')
const { resolve } = require('path')

const { default: fetch, Response } = require('node-fetch')

const config = require('@rm/config')
const { log, HELPERS } = require('@rm/logger')

/**
 * fetch wrapper with timeout and error handling
 * @param {string} url
 * @param {import('node-fetch').RequestInit} [options]
 * @returns
 */
async function fetchJson(url, options = undefined) {
  const controller = new AbortController()

  const timeout = setTimeout(() => {
    controller.abort()
  }, config.getSafe('api.fetchTimeoutMs'))

  try {
    log.debug(HELPERS.fetch, url, options || '')
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
      log.error(HELPERS.fetch, `Unable to fetch ${url}`, '\n', e)
      if (options) {
        fs.writeFileSync(
          resolve(
            __dirname,
            '../../../../logs',
            `${url.replaceAll('/', '_')}${Math.floor(Date.now() / 1000)}.json`,
          ),
          JSON.stringify(options, null, 2),
        )
      }
      return e.cause
    }
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = fetchJson
