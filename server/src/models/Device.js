import { Model } from 'objection'

class Device extends Model {
  static get tableName() {
    return 'device'
  }
}

export default Device