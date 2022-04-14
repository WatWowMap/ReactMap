const { Model } = require('objection')
const {
  database: { settings: { userTableName, gymBadgeTableName } },
} = require('../services/config')

module.exports = class Badge extends Model {
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
    // eslint-disable-next-line global-require
    const User = require('./User')
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: `${gymBadgeTableName}.userId`,
          to: `${userTableName}.id`,
        },
      },
    }
  }

  static async getAll(userId) {
    return this.query()
      .where('userId', userId)
      .andWhere('badge', '>', 0)
  }
}
