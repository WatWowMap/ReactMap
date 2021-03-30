const { Model } = require('objection')

class Gym extends Model {
  static get tableName() {
    return 'gym'
  }
}

module.exports = Gym
