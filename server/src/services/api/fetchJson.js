const fs = require('fs')
const { resolve } = require('path')

const fetch = require('node-fetch')
const config = require('../config')
const { log, HELPERS } = require('../logger')

/**
 * fetch wrapper with timeout and error handling
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns
 */
async function fetchJson(url, options = undefined) {
  const controller = new AbortController()

  const timeout = setTimeout(() => {
    controller.abort()
  }, config.api.fetchTimeoutMs)

  try {
    log.debug(HELPERS.fetch, url, options || '')
    const response = await fetch(url, { ...options, signal: controller.signal })
    if (!response.ok) {
      throw new Error(`${response.status} (${response.statusText})`)
    }
    return response.json()
  } catch (e) {
    log.warn(HELPERS.fetch, `Unable to fetch ${url}`, '\n', e)
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
    return null
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = fetchJson
