const { Model, ref } = require('objection')
const getPolyVector = require('../services/functions/getPolyVector')
const getAreaSql = require('../services/functions/getAreaSql')
const { api: { queryLimits } } = require('../services/config')

module.exports = class ScanCell extends Model {
  static get tableName() {
    return 's2cell'
  }

  static async getAll(perms, args, { isMad }) {
    const { areaRestrictions } = perms
    const query = this.query()
      .select(['*', ref('id')
        .castTo('CHAR')
        .as('id')])
      .whereBetween(`center_lat${isMad ? 'itude' : ''}`, [args.minLat - 0.01, args.maxLat + 0.01])
      .andWhereBetween(`center_lon${isMad ? 'gitude' : ''}`, [args.minLon - 0.01, args.maxLon + 0.01])
    if (areaRestrictions?.length) {
      getAreaSql(query, areaRestrictions, isMad, 's2cell')
    }
    const results = await query
      .limit(queryLimits.scanCells)
      .from(isMad ? 'trs_s2cells' : 's2cell')
    return results.map(cell => ({
      ...cell,
      polygon: getPolyVector(cell.id, 'polygon'),
    }))
  }
}
