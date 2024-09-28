// @ts-check
const { Model } = require('objection')
const { log, TAGS } = require('@rm/logger')

class User extends Model {
  static get tableName() {
    return 'users'
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const { state } = require('../services/state')

    return {
      badges: {
        relation: Model.HasManyRelation,
        modelClass: state.db.models.Badge,
        join: {
          from: `${'users'}.id`,
          to: `${'gymBadges'}.userId`,
        },
      },
      nestSubmissions: {
        relation: Model.HasManyRelation,
        modelClass: state.db.models.NestSubmission,
        join: {
          from: `${'users'}.id`,
          to: `nest_submissions.userId`,
        },
      },
    }
  }

  /**
   *
   * @param {string | number} userId
   * @param {string} strategy
   * @param {string} botName
   */
  static async clearPerms(userId, strategy, botName) {
    await this.query()
      .update({ [`${strategy}Perms`]: null })
      .where({ [`${strategy}Id`]: userId })
      .then(() =>
        log.info(
          TAGS.custom(botName, '#fff2cc'),
          `Cleared ${strategy} perms for user ${userId}`,
        ),
      )
  }

  /**
   *
   * @param {number} id
   * @returns {Promise<import('@rm/types').FullUser | null>}
   */
  static async getOne(id) {
    return this.query().findOne({ id })
  }

  /**
   *
   * @param {number} id
   * @param {string} selectedWebhook
   * @returns {Promise<import('@rm/types').FullUser | null>}
   */
  static async updateWebhook(id, selectedWebhook) {
    await this.query().update({ selectedWebhook }).where({ id })

    return this.getOne(id)
  }
}

module.exports = { User }
