const { Model } = require('objection')
const { database: { settings: { customAuthTableName } } } = require('../services/config')

class CustomAuth extends Model {
  static get tableName() {
    return customAuthTableName
  }
}

module.exports = CustomAuth
