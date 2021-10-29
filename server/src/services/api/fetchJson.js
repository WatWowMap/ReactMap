const fetch = require('node-fetch')

module.exports = async function fetchJson(url, options = undefined, log = false) {
  try {
    if (log) console.log(url, options)
    const response = await fetch(url, options)
    if (!response.ok) {
      throw new Error(`${response.status} (${response.statusText})`)
    }
    return response.json()
  } catch (e) {
    if (log) {
      console.warn(e)
    } else {
      console.warn(e.message, '\n', e.code, `\nUnable to fetch ${url}`)
    }
    return null
  }
}
