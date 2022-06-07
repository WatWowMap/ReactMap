/* eslint-disable no-console */
const fetch = require('node-fetch')
const { AbortError } = require('node-fetch')

module.exports = async function fetchJson(url, options = undefined, log = false) {
  const controller = new AbortController()

  const timeout = setTimeout(() => {
    controller.abort()
  }, 5000)

  try {
    if (log) console.log(url, options)
    const response = await fetch(url, options)
    if (!response.ok) {
      throw new Error(`${response.status} (${response.statusText})`)
    }
    return response.json()
  } catch (e) {
    if (e instanceof AbortError) {
      console.log('Request to', url, 'timed out and was aborted')
    } else if (log) {
      console.warn(e)
    } else if (e instanceof Error) {
      console.warn(e.message, '\n', e.code, `\nUnable to fetch ${url}`)
    }
    return null
  } finally {
    clearTimeout(timeout)
  }
}
