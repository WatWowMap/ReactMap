// @ts-check
const { Model } = require('objection')
const config = require('@rm/config')

const { getAreaSql } = require('../utils/getAreaSql')
const { getEpoch } = require('../utils/getClientTime')

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
   * @param {import("@rm/types").Permissions} perms
   * @param {object} args
   * @param {import("@rm/types").DbContext} ctx
   * @returns {Promise<import("@rm/types").FullRoute[]>}
   */
  static async getAll(perms, args) {
    const { areaRestrictions } = perms
    const { onlyAreas, onlyDistance } = args.filters
    const ts =
      getEpoch() - config.getSafe('api.routeUpdateLimit') * 24 * 60 * 60
    const distanceInMeters = (onlyDistance || [0.5, 100]).map((x) => x * 1000)

    const startLatitude = 'start_lat'
    const startLongitude = 'start_lon'
    const distanceMeters = 'distance_meters'
    const endLatitude = 'end_lat'
    const endLongitude = 'end_lon'

    const query = this.query()
      .select(GET_ALL_SELECT)
      .whereBetween(startLatitude, [args.minLat, args.maxLat])
      .andWhereBetween(startLongitude, [args.minLon, args.maxLon])
      .andWhereBetween(distanceMeters, distanceInMeters)
      .andWhere('updated', '>', ts)
      .union((qb) => {
        qb.select(GET_ALL_SELECT)
          .whereBetween(endLatitude, [args.minLat, args.maxLat])
          .andWhereBetween(endLongitude, [args.minLon, args.maxLon])
          .andWhereBetween(distanceMeters, distanceInMeters)
          .andWhere('updated', '>', ts)
          .from('route')
        getAreaSql(qb, areaRestrictions, onlyAreas, 'route_end')
      })

    if (!getAreaSql(query, areaRestrictions, onlyAreas, 'route_start')) {
      return []
    }
    /** @type {import("@rm/types").FullRoute[]} */
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
   * @param {import('@rm/types').DbContext} ctx
   */
  static async getOne(id) {
    /** @type {import('@rm/types').FullRoute} */
    const result = await this.query().findById(id)

    if (!result) return null

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
   * @param {import('@rm/types').DbContext} ctx
   * @returns {Promise<{ max_distance: number, max_duration: number }>}
   */
  static async getFilterContext() {
    const result = await this.query()
      .max('distance_meters AS max_distance')
      .max('duration_seconds AS max_duration')
      .first()

    // @ts-ignore // shrug, I think we would TS to make this actually work
    return result
  }
}

module.exports = { Route }
