const { Model } = require('objection')

const {
  database: {
    settings: { userTableName, gymBadgeTableName },
  },
} = require('../services/config')
const { log, HELPERS } = require('../services/logger')

module.exports = class User extends Model {
  static get tableName() {
    return userTableName
  }

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

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const Badge = require('./Badge')
    return {
      badges: {
        relation: Model.HasManyRelation,
        modelClass: Badge,
        join: {
          from: `${userTableName}.id`,
          to: `${gymBadgeTableName}.userId`,
        },
      },
    }
  }
}
