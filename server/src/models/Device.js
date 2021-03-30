const { Model } = require('objection')

class Device extends Model {
  static get tableName() {
    return 'device'
  }
}

module.exports = Device
