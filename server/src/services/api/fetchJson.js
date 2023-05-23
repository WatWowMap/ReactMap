const fetch = require('node-fetch')
const config = require('../config')
const { log, HELPERS } = require('../logger')

module.exports = async function fetchJson(url, options = undefined) {
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
    return null
  } finally {
    clearTimeout(timeout)
  }
}
