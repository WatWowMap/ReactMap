const { Model } = require('objection')

class Spawnpoint extends Model {
  static get tableName() {
    return 'spawnpoint'
  }
}

module.exports = Spawnpoint
