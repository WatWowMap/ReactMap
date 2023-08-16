const fetchJson = require('./api/fetchJson')
const scannerApi = require('./api/scannerApi')

module.exports = class Fetch {
  static async json(url, options) {
    return fetchJson(url, options)
  }

  static async scannerApi(...args) {
    return scannerApi(...args)
  }
}
