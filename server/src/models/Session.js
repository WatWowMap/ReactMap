const { Model } = require('objection')
const {
  database: {
    settings: { sessionTableName },
  },
} = require('../services/config')

module.exports = class Session extends Model {
  static get tableName() {
    return sessionTableName
  }
}
