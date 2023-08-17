// @ts-check
const { Model } = require('objection')
const config = require('config')

const { log, HELPERS } = require('../services/logger')

class User extends Model {
  static get tableName() {
    return config.getSafe('database.settings.userTableName')
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const { Db } = require('../services/initialization')
    return {
      badges: {
        relation: Model.HasManyRelation,
        modelClass: Db.models.Badge,
        join: {
          from: `${config.getSafe('database.settings.userTableName')}.id`,
          to: `${config.getSafe('database.settings.gymBadgeTableName')}.userId`,
        },
      },
      nestSubmissions: {
        relation: Model.HasManyRelation,
        modelClass: Db.models.NestSubmission,
        join: {
          from: `${config.getSafe('database.settings.userTableName')}.id`,
          to: `nest_submissions.userId`,
        },
      },
    }
  }

  /**
   *
   * @param {number} userId
   * @param {string} strategy
   * @param {string} botName
   */
  static async clearPerms(userId, strategy, botName) {
    await this.query()
      .update({ [`${strategy}Perms`]: null })
      .where({ [`${strategy}Id`]: userId })
      .then(() =>
        log.info(
          HELPERS.custom(botName, '#fff2cc'),
          `Cleared ${strategy} perms for user ${userId}`,
        ),
      )
  }

  /**
   *
   * @param {number} id
   * @returns {Promise<import('types/models').FullUser | null>}
   */
  static async getOne(id) {
    return this.query().findOne({ id })
  }

  /**
   *
   * @param {number} id
   * @param {string} selectedWebhook
   * @returns {Promise<import('types/models').FullUser | null>}
   */
  static async updateWebhook(id, selectedWebhook) {
    await this.query().update({ selectedWebhook }).where({ id })
    return this.getOne(id)
  }
}

module.exports = User
