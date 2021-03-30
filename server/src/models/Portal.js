const { Model } = require('objection')

class Portal extends Model {
  static get tableName() {
    return 'ingress_portals'
  }
}

module.exports = Portal
