const { Model } = require('objection')
const getAreaSql = require('../services/functions/getAreaSql')

class Route extends Model {
  static get tableName() {
    return 'route'
  }

  /**
   * Returns the bare essentials for displaying on the map
   * @param {import('../types').Permissions} perms
   * @param {object} args
   * @param {import('../types').DbContext} ctx
   * @returns
   */
  static async getAll(perms, args, ctx) {
    const { areaRestrictions } = perms
    const { onlyAreas } = args.filters
    const query = this.query()
      .select([
        'id',
        'start_lat',
        'start_lon',
        'end_lat',
        'end_lon',
        'image',
        'image_border_color',
      ])
      .whereBetween('start_lat', [args.minLat, args.maxLat])
      .andWhereBetween('start_lon', [args.minLon, args.maxLon])

    if (!getAreaSql(query, areaRestrictions, onlyAreas, ctx.isMad, 'route')) {
      return []
    }
    const results = await query

    return results
  }

  /**
   * Returns the full route after querying it, generally from the Popup
   * @param {number} id
   */
  static async getOne(id) {
    const result = await this.query().findById(id)
    if (typeof result.waypoints === 'string') {
      result.waypoints = JSON.parse(result.waypoints)
    }
    if (typeof result.tags === 'string') {
      result.tags = JSON.parse(result.tags)
    }
    return result
  }
}

module.exports = Route
