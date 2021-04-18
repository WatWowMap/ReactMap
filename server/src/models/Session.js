const { Model } = require('objection')
const { database: { settings } } = require('../services/config')

class Session extends Model {
  static get tableName() {
    return settings.sessionTableName
  }
}

module.exports = Session
