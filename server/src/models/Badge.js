// @ts-check
const { Model } = require('objection')
const config = require('@rm/config')

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
    const { state } = require('../services/state')
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: state.db.models.User,
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
   * @returns {Promise<import('@rm/types').FullGymBadge[]>}
   */
  static async getAll(userId, operator = '>', badge = 0) {
    return this.query()
      .where('userId', userId)
      .andWhere('badge', operator, badge)
  }

  /**
   * Returns all badges for a gym
   * @param {number} badge
   * @param {number} gymId
   * @param {number} userId
   */
  static async insert(badge, gymId, userId) {
    // @ts-ignore
    if (
      await this.query()
        .where('gymId', gymId)
        .andWhere('userId', userId)
        .first()
    ) {
      await this.query()
        .where('gymId', gymId)
        .andWhere('userId', userId)
        // @ts-ignore
        .update({ badge })
    } else {
      // @ts-ignore
      await this.query().insert({
        // @ts-ignore
        badge,
        gymId,
        userId,
      })
    }
  }
}

module.exports = { Badge }
