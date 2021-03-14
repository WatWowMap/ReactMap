import { Model } from 'objection'

class S2Cell extends Model {
  static get tableName() {
    return 's2cell'
  }
}

export default S2Cell