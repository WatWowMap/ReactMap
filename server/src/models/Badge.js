// @ts-check
const { Model } = require('objection')
const config = require('config')

class Badge extends Model {
  static get tableName() {
    return config.getSafe('database.settings.gymBadgeTableName')
  }

  $beforeInsert() {
    this.createdAt = Math.floor(Date.now() / 1000)
    this.updatedAt = Math.floor(Date.now() / 1000)
  }

  $beforeUpdate() {
    this.updatedAt = Math.floor(Date.now() / 1000)
  }

  static get relationMappings() {
    const { Db } = require('../services/initialization')
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: Db.models.User,
        join: {
          from: `${config.getSafe(
            'database.settings.gymBadgeTableName',
          )}.userId`,
          to: `${config.getSafe('database.settings.userTableName')}.id`,
        },
      },
    }
  }

  /**
   * Returns all badges for a user
   * @param {number} userId
   * @param {'>' | '>=' | '<' | '<=' | '='} operator
   * @param {number} badge
   * @returns {Promise<import('types/models').FullGymBadge[]>}
   */
  static async getAll(userId, operator = '>', badge = 0) {
    return this.query()
      .where('userId', userId)
      .andWhere('badge', operator, badge)
  }
}

module.exports = Badge
