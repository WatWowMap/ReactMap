// @ts-check
const { Model } = require('objection')
const config = require('@rm/config')

const { getAreaSql } = require('../utils/getAreaSql')
const { getEpoch } = require('../utils/getClientTime')
const { applyManualIdFilter } = require('../utils/manualFilter')

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
  static async getAll(perms, args, { hasShortcode }) {
    const { areaRestrictions } = perms
    const { onlyAreas, onlyDistance } = args.filters
    const ts =
      getEpoch() - config.getSafe('api.routeUpdateLimit') * 24 * 60 * 60
    const distanceInMeters = (onlyDistance || [0.5, 100]).map((x) => x * 1000)
    const query = this.query().select(GET_ALL_SELECT)
    const manualId = applyManualIdFilter(query, {
      manualId: args.filters.onlyManualId,
      latColumn: 'start_lat',
      lonColumn: 'start_lon',
      idColumn: 'id',
      bounds: {
        minLat: args.minLat,
        maxLat: args.maxLat,
        minLon: args.minLon,
        maxLon: args.maxLon,
      },
    })
    query
      .andWhereBetween('distance_meters', distanceInMeters)
      .andWhere((builder) => {
        builder.where('updated', '>', ts)
        if (hasShortcode) {
          builder.orWhere('shortcode', '<>', '')
        }
      })
      .union((qb) => {
        qb.select(GET_ALL_SELECT)
        applyManualIdFilter(qb, {
          manualId,
          latColumn: 'end_lat',
          lonColumn: 'end_lon',
          idColumn: 'id',
          bounds: {
            minLat: args.minLat,
            maxLat: args.maxLat,
            minLon: args.minLon,
            maxLon: args.maxLon,
          },
        })
        qb.andWhereBetween('distance_meters', distanceInMeters)
          .andWhere((builder) => {
            builder.where('updated', '>', ts)
            if (hasShortcode) {
              builder.orWhere('shortcode', '<>', '')
            }
          })
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
   * @returns {Promise<{ max_distance: number, max_duration: number }>}
   */
  static async getFilterContext() {
    const result = await this.query()
      .max('distance_meters AS max_distance')
      .max('duration_seconds AS max_duration')
      .first()

    // @ts-expect-error // shrug, I think we would TS to make this actually work
    return result
  }
}

module.exports = { Route }
