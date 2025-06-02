// @ts-check
const { Model, ref } = require('objection')
const config = require('@rm/config')

const { getPolyVector } = require('../utils/getPolyVector')
const { getAreaSql } = require('../utils/getAreaSql')

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
  static async getAll(perms, args) {
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
      .whereBetween('center_lat', [minLat - 0.01, maxLat + 0.01])
      .andWhereBetween('center_lon', [minLon - 0.01, maxLon + 0.01])
    if (!getAreaSql(query, areaRestrictions, onlyAreas, 's2cell')) {
      return []
    }
    /** @type {import('@rm/types').FullScanCell[]} */
    const results = await query
      .limit(config.getSafe('api.queryLimits.scanCells'))
      .from('s2cell')

    results.forEach((cell) => {
      cell.polygon = getPolyVector(cell.id, true).polygon
    })
    return results
  }
}

module.exports = { ScanCell }
