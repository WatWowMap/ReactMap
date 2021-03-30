const { Model } = require('objection')

class Weather extends Model {
  static get tableName() {
    return 'weather'
  }
}

module.exports = Weather
