const { Model } = require('objection')
const config = require('../services/config')

class Session extends Model {
  static get tableName() {
    return config.db.scanner.sessionTable
  }
}

module.exports = Session
