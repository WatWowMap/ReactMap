const { Model, ref, raw } = require('objection')
const getPolyVector = require('../services/functions/getPolyVector')
const {
  api: { weatherCellLimit },
} = require('../services/config')

module.exports = class Weather extends Model {
  static get tableName() {
    return 'weather'
  }

  static async getAll(_perms, _args, { isMad }) {
    const query = this.query().select([
      '*',
      ref(isMad ? 's2_cell_id' : 'id')
        .castTo('CHAR')
        .as('id'),
    ])
    if (isMad) {
      query.select([
        'gameplay_weather AS gameplay_condition',
        raw('UNIX_TIMESTAMP(last_updated)').as('updated'),
      ])
    } else {
      const ts = Math.floor(new Date().getTime() / 1000)
      const ms = ts - weatherCellLimit * 60 * 60 * 24
      query.where('updated', '>=', ms)
    }
    const results = await query
    return results.map((cell) => ({
      ...cell,
      polygon: getPolyVector(cell.id, true),
    }))
  }
}
