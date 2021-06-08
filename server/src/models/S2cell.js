const { Model, ref } = require('objection')
const dbSelection = require('../services/functions/dbSelection')
const getPolyVector = require('../services/functions/getPolyVector')

class S2cell extends Model {
  static get tableName() {
    return dbSelection('s2cell') === 'mad'
      ? 'trs_s2cells' : 's2cell'
  }

  static async getAllCells(args, isMad) {
    const results = await this.query()
      .select(['*', ref('id')
        .castTo('CHAR')
        .as('id')])
      .whereBetween(`center_lat${isMad ? 'itude' : ''}`, [args.minLat - 0.01, args.maxLat + 0.01])
      .andWhereBetween(`center_lon${isMad ? 'gitude' : ''}`, [args.minLon - 0.01, args.maxLon + 0.01])
    return results.map(cell => ({
      ...cell,
      polygon: getPolyVector(cell.id, 'polygon'),
    }))
  }
}

module.exports = S2cell
