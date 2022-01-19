const { Model } = require('objection')
const { database: { settings: { userTableName } } } = require('../services/config')

module.exports = class Badge extends Model {
  static get tableName() {
    return 'gymBadges'
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
          from: 'gymBadges.userId',
          to: `${userTableName}.id`,
        },
      },
    }
  }
}
