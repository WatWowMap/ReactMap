const fetchJson = require('./api/fetchJson')
const fetchRaids = require('./api/fetchRaids')
const fetchQuests = require('./api/fetchQuests')
const fetchNests = require('./api/fetchNests')
const webhookApi = require('./api/webhookApi')
const scannerApi = require('./api/scannerApi')

module.exports = class Fetch {
  static async json(url, options) {
    return fetchJson(url, options)
  }

  static async raids() {
    return fetchRaids()
  }

  static async quests() {
    return fetchQuests()
  }

  static async nests() {
    return fetchNests()
  }

  static async webhookApi(category, discordId, method, name, data) {
    return webhookApi(category, discordId, method, name, data)
  }

  static async scannerApi(category, method, data, user) {
    return scannerApi(category, method, data, user)
  }
}
