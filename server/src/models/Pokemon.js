import { Model } from 'objection'

class Pokemon extends Model {
  static get tableName() {
    return 'pokemon'
  }
}

export default Pokemon