const { Model } = require('objection')
const { database: { settings: { localUserTableName } } } = require('../services/config')

class LocalUser extends Model {
  static get tableName() {
    return localUserTableName
  }
}

module.exports = LocalUser
