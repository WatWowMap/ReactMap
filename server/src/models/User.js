const { Model } = require('objection')
const { database: { settings: { userTableName } } } = require('../services/config')

class User extends Model {
  static get tableName() {
    return userTableName
  }
}

module.exports = User
