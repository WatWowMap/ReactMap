const fetch = require('node-fetch')

module.exports = async function fetchJson(url, options = undefined) {
  try {
    return fetch(url, options)
      .then(res => res.json())
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(e, `\nUnable to fetch ${url}`)
  }
}
