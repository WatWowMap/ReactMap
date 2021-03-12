import { Model } from 'objection'

class Spawnpoint extends Model {
  static get tableName() {
    return 'spawnpoint'
  }
}

export default Spawnpoint