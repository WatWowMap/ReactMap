const { Model, ref } = require('objection')
const config = require('config')

const getPolyVector = require('../services/functions/getPolyVector')
const getAreaSql = require('../services/functions/getAreaSql')

module.exports = class ScanCell extends Model {
  static get tableName() {
    return 's2cell'
  }

  /**
   *
   * @param {import('types').Permissions} perms
   * @param {object} args
   * @param {import('types').DbContext} context
   * @returns {Promise<import('types').FullScanCell[]>}
   */
  static async getAll(perms, args, { isMad }) {
    const { areaRestrictions } = perms
    const {
      filters: { onlyAreas = [] },
      minLat,
      minLon,
      maxLat,
      maxLon,
    } = args
    const query = this.query()
      .select(['*', ref('id').castTo('CHAR').as('id')])
      .whereBetween(`center_lat${isMad ? 'itude' : ''}`, [
        minLat - 0.01,
        maxLat + 0.01,
      ])
      .andWhereBetween(`center_lon${isMad ? 'gitude' : ''}`, [
        minLon - 0.01,
        maxLon + 0.01,
      ])
    if (!getAreaSql(query, areaRestrictions, onlyAreas, isMad, 's2cell')) {
      return []
    }
    const results = await query
      .limit(config.getSafe('api.queryLimits.scanCells'))
      .from(isMad ? 'trs_s2cells' : 's2cell')
    return results.map((cell) => ({
      ...cell,
      polygon: getPolyVector(cell.id, 'polygon').poly,
    }))
  }
}
