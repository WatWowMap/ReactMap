import { Model } from 'objection'

class Pokestop extends Model {
  static get tableName() {
    return 'pokestop'
  }
}

export default Pokestop