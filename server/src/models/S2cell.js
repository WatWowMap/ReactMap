const { Model } = require('objection')

class S2Cell extends Model {
  static get tableName() {
    return 's2cell'
  }
}

module.exports = S2Cell
