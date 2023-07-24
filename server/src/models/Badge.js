const { Model } = require('objection')
const {
  database: {
    settings: { userTableName, gymBadgeTableName },
  },
} = require('../services/config')

class Badge extends Model {
  /** @returns {string} */
  static get tableName() {
    return gymBadgeTableName
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
          from: `${gymBadgeTableName}.userId`,
          to: `${userTableName}.id`,
        },
      },
    }
  }

  /**
   * Returns all badges for a user
   * @param {number} userId
   * @param {'>' | '>=' | '<' | '<=' | '='} operator
   * @param {number} badge
   * @returns
   */
  static async getAll(userId, operator = '>', badge = 0) {
    return this.query()
      .where('userId', userId)
      .andWhere('badge', operator, badge)
  }
}

module.exports = Badge
