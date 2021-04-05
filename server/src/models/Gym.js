const { Model } = require('objection')

class Gym extends Model {
  static get tableName() {
    return 'gym'
  }

  static async getAllGyms(args) {
    return this.query()
      .whereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])
      .andWhere('deleted', false)
  }
}

module.exports = Gym
