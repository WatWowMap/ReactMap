// @ts-check
const { Model } = require('objection')
const config = require('@rm/config')

const { getAreaSql } = require('../utils/getAreaSql')

class Spawnpoint extends Model {
  static get tableName() {
    return 'spawnpoint'
  }

  /**
   *
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @returns {Promise<import("@rm/types").FullSpawnpoint[]>}
   */
  static async getAll(perms, args) {
    const { areaRestrictions } = perms
    const {
      filters: { onlyAreas = [], onlyTth = 0 },
      minLat,
      minLon,
      maxLat,
      maxLon,
    } = args
    const query = Spawnpoint.query()
    query
      .whereBetween('lat', [minLat, maxLat])
      .andWhereBetween('lon', [minLon, maxLon])
    if (onlyTth !== 0) {
      if (onlyTth === 1) {
        query.whereNotNull('despawn_sec')
      } else if (onlyTth === 2) {
        query.whereNull('despawn_sec')
      }
    }
    if (!getAreaSql(query, areaRestrictions, onlyAreas)) {
      return []
    }
    return query
      .limit(config.getSafe('api.queryLimits.spawnpoints'))
      .from('spawnpoint')
  }
}

module.exports = { Spawnpoint }
