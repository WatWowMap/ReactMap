import { Model } from 'objection'

class Weather extends Model {
  static get tableName() {
    return 'weather'
  }
}

export default Weather