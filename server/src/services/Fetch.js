const fetchJson = require('./api/fetchJson')
const webhookApi = require('./api/webhookApi')
const scannerApi = require('./api/scannerApi')

module.exports = class Fetch {
  static async json(url, options) {
    return fetchJson(url, options)
  }

  static async webhookApi(category, discordId, method, name, data) {
    return webhookApi(category, discordId, method, name, data)
  }

  static async scannerApi(category, method, data, user) {
    return scannerApi(category, method, data, user)
  }
}
