const { Model } = require('objection')
const { database } = require('../services/config')

class User extends Model {
  static get tableName() {
    return database.settings.userTableName
  }
}

module.exports = User
