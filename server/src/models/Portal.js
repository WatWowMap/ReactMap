const { Model } = require('objection')
const getAreaSql = require('../services/functions/getAreaSql')
const {
  api: { searchResultsLimit, portalUpdateLimit, queryLimits },
} = require('../services/config')

module.exports = class Portal extends Model {
  static get tableName() {
    return 'ingress_portals'
  }

  static async getAll(perms, args) {
    const { areaRestrictions } = perms
    const query = this.query()
      .whereBetween('lat', [args.minLat, args.maxLat])
      .andWhereBetween('lon', [args.minLon, args.maxLon])
      .andWhere('updated', '>', (Date.now() / 1000) - portalUpdateLimit * 60 * 60 * 24)
    if (areaRestrictions?.length) {
      getAreaSql(query, areaRestrictions, false, 'portals')
    }
    return query.limit(queryLimits.portals)
  }

  static async search(perms, args, { isMad }, distance) {
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
      .whereRaw(`LOWER(name) LIKE '%${args.search}%'`)
      .andWhere('updated', '>', (Date.now() / 1000) - portalUpdateLimit * 60 * 60 * 24)
      .limit(searchResultsLimit)
      .orderBy('distance')
    if (areaRestrictions?.length) {
      getAreaSql(query, areaRestrictions, isMad, 'portals')
    }
    return query
  }

  static getOne(id) {
    return this.query().findById(id).select(['lat', 'lon'])
  }
}
