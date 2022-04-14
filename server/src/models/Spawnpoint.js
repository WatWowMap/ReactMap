const { Model, raw } = require('objection')
const getAreaSql = require('../services/functions/getAreaSql')
const { api: { queryLimits } } = require('../services/config')

module.exports = class Spawnpoint extends Model {
  static get tableName() {
    return 'spawnpoint'
  }

  static async getAll(perms, args, { isMad }) {
    const { areaRestrictions } = perms
    const query = this.query()
    if (isMad) {
      query.select([
        'spawnpoint AS id',
        'latitude AS lat',
        'longitude AS lon',
        raw('ROUND(calc_endminsec)')
          .as('despawn_sec'),
        raw('UNIX_TIMESTAMP(last_scanned)')
          .as('updated'),
      ])
    }
    query.whereBetween(`lat${isMad ? 'itude' : ''}`, [args.minLat, args.maxLat])
      .andWhereBetween(`lon${isMad ? 'gitude' : ''}`, [args.minLon, args.maxLon])
    if (areaRestrictions?.length) {
      getAreaSql(query, areaRestrictions, isMad, 'spawnpoints')
    }
    return query
      .limit(queryLimits.spawnpoints)
      .from(isMad ? 'trs_spawn' : 'spawnpoint')
  }
}
