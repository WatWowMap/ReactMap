const fetch = require('node-fetch')

module.exports = async function fetchJson(url, options = undefined) {
  try {
    console.log(url, options)
    const response = await fetch(url, options)
    if (!response.ok) {
      throw new Error(`${response.status} (${response.statusText})`)
    }
    return response.json()
  } catch (e) {
    console.warn(e, `\nUnable to fetch ${url}`)
    return null
  }
}
