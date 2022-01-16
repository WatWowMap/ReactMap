const { Model } = require('objection')
const { database: { settings: { userTableName } } } = require('../services/config')

module.exports = class Badge extends Model {
  static get tableName() {
    return 'gym_badges'
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const User = require('./User')
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: User,
        join: {
          from: 'gym_badges.user_id',
          to: `${userTableName}.id`,
        },
      },
    }
  }
}
