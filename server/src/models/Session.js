/* eslint-disable no-console */
const { Model } = require('objection')
const {
  api: { maxSessions },
  database: {
    settings: { sessionTableName },
  },
} = require('../services/config')

module.exports = class Session extends Model {
  static get tableName() {
    return sessionTableName
  }

  static async clear() {
    await this.query().delete()
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
      console.error('[SESSION] Unable to validate session', e)
      return false
    }
  }

  static async clearOtherSessions(userId, currentSessionId) {
    try {
      const results = await this.query()
        .whereRaw(`json_extract(data, '$.passport.user.id') = ${userId}`)
        .andWhere('session_id', '!=', currentSessionId || '')
        .delete()
      console.log('[Session] Clear Result:', results)
    } catch (e) {
      console.error('[SESSION] Unable to clear other sessions', e)
    }
  }

  static async clearDiscordSessions(discordId, botName) {
    try {
      const results = await this.query()
        .whereRaw(
          `json_extract(data, '$.passport.user.discordId') = '${discordId}'`,
        )
        .orWhereRaw(`json_extract(data, '$.passport.user.id') = '${discordId}'`)
        .delete()
      console.log(
        `[Session${botName && ` - ${botName}`}] Clear Result:`,
        results,
      )
    } catch (e) {
      console.error('[SESSION] Unable to clear Discord sessions', e)
    }
  }
}
