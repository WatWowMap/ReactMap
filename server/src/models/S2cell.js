const { Model } = require('objection')

class S2cell extends Model {
  static get tableName() {
    return 's2cell'
  }
}

module.exports = S2cell
