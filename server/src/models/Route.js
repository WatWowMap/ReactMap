const { Model } = require('objection')
const getAreaSql = require('../services/functions/getAreaSql')

const GET_ALL_SELECT = /** @type {const} */ ([
  'id',
  'start_lat',
  'start_lon',
  'end_lat',
  'end_lon',
  'waypoints',
  'image_border_color',
  'reversible',
])

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
      .select(GET_ALL_SELECT)
      .whereBetween('start_lat', [args.minLat, args.maxLat])
      .andWhereBetween('start_lon', [args.minLon, args.maxLon])
      .union((qb) => {
        qb.select(GET_ALL_SELECT)
          .whereBetween('end_lat', [args.minLat, args.maxLat])
          .andWhereBetween('end_lon', [args.minLon, args.maxLon])
          .from('route')

        getAreaSql(qb, areaRestrictions, onlyAreas, ctx.isMad, 'route')
      })

    if (!getAreaSql(query, areaRestrictions, onlyAreas, ctx.isMad, 'route')) {
      return []
    }
    const results = await query

    return results.map((result) => {
      if (typeof result.waypoints === 'string') {
        result.waypoints = JSON.parse(result.waypoints)
      } else if (result.waypoints === null) {
        result.waypoints = []
      }
      return result
    })
  }

  /**
   * Returns the full route after querying it, generally from the Popup
   * @param {number} id
   */
  static async getOne(id) {
    const result = await this.query().findById(id)
    if (typeof result.waypoints === 'string') {
      result.waypoints = JSON.parse(result.waypoints)
    } else if (result.waypoints === null) {
      result.waypoints = []
    }
    if (typeof result.tags === 'string') {
      result.tags = JSON.parse(result.tags)
    } else if (result.tags === null) {
      result.tags = []
    }
    if (typeof result.image === 'string') {
      result.image = result.image.replace('http://', 'https://')
    }
    if (typeof result.start_image === 'string') {
      result.start_image = result.start_image.replace('http://', 'https://')
    }
    if (typeof result.end_image === 'string') {
      result.end_image = result.end_image.replace('http://', 'https://')
    }
    return result
  }

  /**
   * returns route context
   * @returns {{ max_distance: number, max_duration: number }}
   */
  static async getFilterContext() {
    const result = await this.query()
      .max('distance_meters AS max_distance')
      .max('duration_seconds AS max_duration')
      .first()

    return result
  }
}

module.exports = Route
