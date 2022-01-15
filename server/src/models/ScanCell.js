const { Model, ref } = require('objection')
const dbSelection = require('../services/functions/dbSelection')
const getPolyVector = require('../services/functions/getPolyVector')
const getAreaSql = require('../services/functions/getAreaSql')

module.exports = class ScanCell extends Model {
  static get tableName() {
    return dbSelection('scanCell').type === 'mad'
      ? 'trs_s2cells' : 's2cell'
  }

  static async getAllCells(args, perms, isMad) {
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
    return results.map(cell => ({
      ...cell,
      polygon: getPolyVector(cell.id, 'polygon'),
    }))
  }
}
