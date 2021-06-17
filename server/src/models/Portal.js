const { Model } = require('objection')
const getAreaSql = require('../services/functions/getAreaSql')

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
}

module.exports = Portal
