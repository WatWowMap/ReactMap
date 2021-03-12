import { Model } from 'objection'

class Portal extends Model {
  static get tableName() {
    return 'ingress_portals'
  }
}

export default Portal