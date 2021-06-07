const { Model } = require('objection')
const dbSelection = require('../services/functions/dbSelection')

class Device extends Model {
  static get tableName() {
    return dbSelection('device') === 'mad' ? 'settings_device' : 'device'
  }

  static get idColumn() {
    return dbSelection('device').type === 'mad' ? 'device_id' : 'uuid'
  }
}

module.exports = Device
