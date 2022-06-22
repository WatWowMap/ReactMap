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
    const {
      filters: { userAreas = [] },
      minLat,
      minLon,
      maxLat,
      maxLon,
    } = args
    const query = this.query()
      .whereBetween('lat', [minLat, maxLat])
      .andWhereBetween('lon', [minLon, maxLon])
      .andWhere(
        'updated',
        '>',
        Date.now() / 1000 - portalUpdateLimit * 60 * 60 * 24,
      )
    if (!getAreaSql(query, areaRestrictions, userAreas)) {
      return []
    }
    return query.limit(queryLimits.portals)
  }

  static async search(perms, args, { isMad }, distance) {
    const { areaRestrictions } = perms
    const { userAreas = [], search } = args
    const query = this.query()
      .select(['name', 'id', 'lat', 'lon', 'url', distance])
      .whereRaw(`LOWER(name) LIKE '%${search}%'`)
      .andWhere(
        'updated',
        '>',
        Date.now() / 1000 - portalUpdateLimit * 60 * 60 * 24,
      )
      .limit(searchResultsLimit)
      .orderBy('distance')
    if (!getAreaSql(query, areaRestrictions, userAreas, isMad)) {
      return []
    }
    return query
  }

  static getOne(id) {
    return this.query().findById(id).select(['lat', 'lon'])
  }
}
