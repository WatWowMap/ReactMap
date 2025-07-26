// @ts-check
const { Model } = require('objection')

class Hyperlocal extends Model {
  static get tableName() {
    return 'hyperlocal'
  }

  static get idColumn() {
    return ['experiment_id', 'lat', 'lon']
  }

  /**
   * Returns all hyperlocal records within bounds
   * @param {import('@rm/types').Permissions} perms
   * @param {object} args
   * @returns {Promise<import('@rm/types').Hyperlocal[]>}
   */
  static async getAll(perms, { minLat, maxLat, minLon, maxLon }) {
    const query = this.query()
      .whereBetween('lat', [minLat, maxLat])
      .whereBetween('lon', [minLon, maxLon])

    // Only show active bonus regions (not expired)
    const now = Date.now()
    query.where('end_ms', '>', now)

    const results = await query

    // Add unique id for React keys by combining the composite primary key
    return results.map((hyperlocal) => ({
      ...hyperlocal,
      id: `${hyperlocal.experiment_id}_${hyperlocal.lat}_${hyperlocal.lon}`,
    }))
  }

  /**
   * Returns a single hyperlocal record
   * @param {number} experimentId
   * @param {number} lat
   * @param {number} lon
   * @returns {Promise<import('@rm/types').Hyperlocal>}
   */
  static async getOne(experimentId, lat, lon) {
    return this.query()
      .where('experiment_id', experimentId)
      .where('lat', lat)
      .where('lon', lon)
      .first()
  }
}

module.exports = { Hyperlocal }
