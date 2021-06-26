const { Model } = require('objection')
const getAreaSql = require('../services/functions/getAreaSql')
const { api: { searchResultsLimit } } = require('../services/config')

class Portal extends Model {
  static get tableName() {
    return 'ingress_portals'
  }

  static async getAllPortals(args, perms) {
    const { areaRestrictions } = perms
    const query = this.query()
      .whereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])
    if (areaRestrictions.length > 0) {
      getAreaSql(query, areaRestrictions)
    }
    return query
  }

  static async search(args, perms, isMad, distance) {
    const { areaRestrictions } = perms
    const query = this.query()
      .select([
        'name',
        'id',
        'lat',
        'lon',
        'url',
        distance,
      ])
      .orWhereRaw(`LOWER(name) LIKE '%${args.search}%'`)
      .limit(searchResultsLimit)
      .orderBy('distance')
    if (areaRestrictions.length > 0) {
      getAreaSql(query, areaRestrictions, isMad)
    }
    return query
  }
}

module.exports = Portal
