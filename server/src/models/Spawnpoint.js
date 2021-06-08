const { Model, raw } = require('objection')
const dbSelection = require('../services/functions/dbSelection')

class Spawnpoint extends Model {
  static get tableName() {
    return dbSelection('spawnpoint') === 'mad'
      ? 'trs_spawn' : 'spawnpoint'
  }

  static get idColumn() {
    return dbSelection('spawnpoint') === 'mad'
      ? 'spawnpoint' : 'id'
  }

  static async getAllSpawnpoints(args, isMad) {
    if (isMad) {
      return this.query()
        .select([
          'spawnpoint AS id',
          'latitude AS lat',
          'longitude AS lon',
          raw('ROUND(calc_endminsec)')
            .as('despawn_sec'),
          raw('UNIX_TIMESTAMP(last_scanned)')
            .as('updated'),
        ])
        .whereBetween('latitude', [args.minLat, args.maxLat])
        .andWhereBetween('longitude', [args.minLon, args.maxLon])
    }
    return this.query()
      .whereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])
  }
}

module.exports = Spawnpoint
