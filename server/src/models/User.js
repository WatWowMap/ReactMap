const { Model } = require('objection')
const { database: { settings } } = require('../services/config')

class User extends Model {
  static get tableName() {
    return settings.userTableName
  }
}

module.exports = User
