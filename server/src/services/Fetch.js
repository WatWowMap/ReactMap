const fetchJson = require('./api/fetchJson')
const webhookApi = require('./api/webhookApi')
const scannerApi = require('./api/scannerApi')

module.exports = class Fetch {
  static async json(url, options) {
    return fetchJson(url, options)
  }

  static async webhookApi(...args) {
    return webhookApi(...args)
  }

  static async scannerApi(...args) {
    return scannerApi(...args)
  }
}
