import { Model } from 'objection'

class Gym extends Model {
  static get tableName() {
    return 'gym'
  }
}

export default Gym