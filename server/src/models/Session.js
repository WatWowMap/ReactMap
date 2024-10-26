// @ts-check
const { Model } = require('objection')
const config = require('@rm/config')
const { log, TAGS } = require('@rm/logger')

class Session extends Model {
  static get tableName() {
    return config.getSafe('database.settings.sessionTableName')
  }

  static async clear() {
    const results = await this.query().delete()
    log.info(TAGS.session, 'Clear Result:', results)
    return results
  }

  /** @param {string} strategy */
  static async clearNonDonor(strategy) {
    const result = await this.query()
      .whereRaw(`json_extract(data, '$.passport.user.perms.donor') = false`)
      .andWhereRaw(
        `json_extract(data, '$.passport.user.rmStrategy') = '${strategy}'`,
      )
      .delete()
    log.info(
      TAGS.session,
      'Cleared',
      result,
      'non-donor sessions for',
      strategy,
    )
    return result
  }

  /** @param {string} strategy */
  static async clearTrial(strategy) {
    return this.query()
      .whereRaw(`json_extract(data, '$.passport.user.perms.trial') = true`)
      .andWhereRaw(
        `json_extract(data, '$.passport.user.rmStrategy') = '${strategy}'`,
      )
      .delete()
  }

  /**
   *
   * @param {number} userId
   * @returns
   */
  static async isValidSession(userId) {
    try {
      const ts = Math.floor(Date.now() / 1000)
      const results = await this.query()
        .select('session_id')
        .whereRaw(`json_extract(data, '$.passport.user.id') = ${userId}`)
        .andWhere('expires', '>=', ts)
      return results.length <= config.getSafe('api.maxSessions')
    } catch (e) {
      log.error(TAGS.session, 'Unable to validate session', e)
      return false
    }
  }

  /**
   *
   * @param {number} userId
   * @param {string} currentSessionId
   * @returns
   */
  static async clearOtherSessions(userId, currentSessionId) {
    try {
      const results = await this.query()
        .whereRaw(`json_extract(data, '$.passport.user.id') = ${userId}`)
        .andWhere('session_id', '!=', currentSessionId || '')
        .delete()
      log.info(TAGS.session, 'Clear Result:', results)
      return results
    } catch (e) {
      log.error(TAGS.session, 'Unable to clear other sessions', e)
    }
    return 0
  }

  /**
   *
   * @param {string} discordId
   * @param {string} botName
   * @returns
   */
  static async clearDiscordSessions(discordId, botName) {
    try {
      const results = await this.query()
        .whereRaw(
          `json_extract(data, '$.passport.user.discordId') = '${discordId}'`,
        )
        .orWhereRaw(`json_extract(data, '$.passport.user.id') = '${discordId}'`)
        .delete()
      log.info(
        TAGS.session,
        botName ? TAGS.custom(botName) : '',
        'Clear Result:',
        results,
      )
      return results
    } catch (e) {
      log.error(TAGS.session, 'Unable to clear Discord sessions', e)
    }
    return 0
  }
}

module.exports = { Session }
