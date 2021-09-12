const fetch = require('node-fetch')

module.exports = function fetchJson(url) {
  try {
    return new Promise(resolve => {
      fetch(url)
        .then(res => res.json())
        .then(json => resolve(json))
    })
  } catch (e) {
    console.warn(e, `\nUnable to fetch ${url}`)
  }
}
