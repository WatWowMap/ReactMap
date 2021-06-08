const Fetch = require('node-fetch')

module.exports = function fetchJson(url) {
  try {
    return new Promise(resolve => {
      Fetch(url)
        .then(res => res.json())
        .then(json => resolve(json))
    })
  } catch (e) {
    console.warn(e, `\nUnable to fetch ${url}`)
  }
}
