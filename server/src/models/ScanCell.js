// @ts-check
const { Model, ref } = require('objection')
const config = require('@rm/config')

const getPolyVector = require('../services/functions/getPolyVector')
const getAreaSql = require('../services/functions/getAreaSql')

class ScanCell extends Model {
  static get tableName() {
    return 's2cell'
  }

  /**
   *
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @param {import("@rm/types").DbContext} context
   * @returns {Promise<import("@rm/types").ScanCell[]>}
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
    /** @type {import('@rm/types').FullScanCell[]} */
    const results = await query
      .limit(config.getSafe('api.queryLimits.scanCells'))
      .from(isMad ? 'trs_s2cells' : 's2cell')

    results.forEach((cell) => {
      cell.polygon = getPolyVector(cell.id, true).polygon
    })
    return results
  }
}

module.exports = ScanCell
