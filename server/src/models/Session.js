const { Model } = require('objection')
const { database: { settings: { sessionTableName } } } = require('../services/config')

class Session extends Model {
  static get tableName() {
    return sessionTableName
  }
}

module.exports = Session
