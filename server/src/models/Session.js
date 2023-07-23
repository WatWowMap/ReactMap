const { Model } = require('objection')
const {
  api: { maxSessions },
  database: {
    settings: { sessionTableName },
  },
} = require('../services/config')
const { log, HELPERS } = require('../services/logger')

module.exports = class Session extends Model {
  /** @returns {string} */
  static get tableName() {
    return sessionTableName
  }

  static async clear() {
    const results = await this.query().delete()
    log.info(HELPERS.session, 'Clear Result:', results)
    return results
  }

  static async isValidSession(userId) {
    try {
      const ts = Math.floor(new Date().getTime() / 1000)
      const results = await this.query()
        .select('session_id')
        .whereRaw(`json_extract(data, '$.passport.user.id') = ${userId}`)
        .andWhere('expires', '>=', ts)
      return results.length < maxSessions
    } catch (e) {
      log.error(HELPERS.session, 'Unable to validate session', e)
      return false
    }
  }

  static async clearOtherSessions(userId, currentSessionId) {
    try {
      const results = await this.query()
        .whereRaw(`json_extract(data, '$.passport.user.id') = ${userId}`)
        .andWhere('session_id', '!=', currentSessionId || '')
        .delete()
      log.info(HELPERS.session, 'Clear Result:', results)
      return results
    } catch (e) {
      log.error(HELPERS.session, 'Unable to clear other sessions', e)
    }
    return 0
  }

  static async clearDiscordSessions(discordId, botName) {
    try {
      const results = await this.query()
        .whereRaw(
          `json_extract(data, '$.passport.user.discordId') = '${discordId}'`,
        )
        .orWhereRaw(`json_extract(data, '$.passport.user.id') = '${discordId}'`)
        .delete()
      log.info(
        HELPERS.session,
        botName ? HELPERS.custom(botName) : '',
        'Clear Result:',
        results,
      )
      return results
    } catch (e) {
      log.error(HELPERS.session, 'Unable to clear Discord sessions', e)
    }
    return 0
  }
}
