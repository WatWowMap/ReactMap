const fetchJson = require('./api/fetchJson')
const fetchRaids = require('./api/fetchRaids')
const fetchQuests = require('./api/fetchQuests')
const fetchNests = require('./api/fetchNests')
const webhookApi = require('./api/webhookApi')

module.exports = class Fetch {
  static async fetchJson(url) {
    return fetchJson(url)
  }

  static async fetchRaids() {
    return fetchRaids()
  }

  static async fetchQuests() {
    return fetchQuests()
  }

  static async fetchNests() {
    return fetchNests()
  }

  static async webhookApi(category, discordId, method, name, data) {
    return webhookApi(category, discordId, method, name, data)
  }
}
