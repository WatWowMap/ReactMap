const Fetch = require('node-fetch')

module.exports = function fetchJson(url) {
  return new Promise(resolve => {
    Fetch(url)
      .then(res => res.json())
      .then(json => resolve(json))
  })
}
