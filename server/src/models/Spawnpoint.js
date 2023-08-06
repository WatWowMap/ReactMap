const { Model, raw } = require('objection')
const getAreaSql = require('../services/functions/getAreaSql')
const {
  api: { queryLimits },
} = require('../services/config')
const { log, HELPERS } = require('../services/logger')

module.exports = class Spawnpoint extends Model {
  static get tableName() {
    return 'spawnpoint'
  }

  static async getAll(perms, args, { isMad }) {
    const { areaRestrictions } = perms
    const {
      filters: { onlyAreas = [], onlyTth = 0 },
      minLat,
      minLon,
      maxLat,
      maxLon,
    } = args
    const query = this.query()
    if (isMad) {
      query.select([
        'spawnpoint AS id',
        'latitude AS lat',
        'longitude AS lon',
        raw('ROUND(calc_endminsec)').as('despawn_sec'),
        raw('UNIX_TIMESTAMP(last_scanned)').as('updated'),
      ])
    }
    query
      .whereBetween(`lat${isMad ? 'itude' : ''}`, [minLat, maxLat])
      .andWhereBetween(`lon${isMad ? 'gitude' : ''}`, [minLon, maxLon])
    if (onlyTth !== 0) {
      if (isMad) {
        log.warn(
          HELPERS.spawnpoints,
          'this feature is not currently supported for MAD, PRs will be accepted',
        )
      } else if (onlyTth === 1) {
        query.whereNotNull('despawn_sec')
      } else if (onlyTth === 2) {
        query.whereNull('despawn_sec')
      }
    }
    if (!getAreaSql(query, areaRestrictions, onlyAreas, isMad)) {
      return []
    }
    return query
      .limit(queryLimits.spawnpoints)
      .from(isMad ? 'trs_spawn' : 'spawnpoint')
  }
}
