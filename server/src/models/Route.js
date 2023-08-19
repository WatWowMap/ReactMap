// @ts-check
const { Model, raw } = require('objection')
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
const GET_MAD_ALL_SELECT = /** @type {const} */ ({
  id: 'route_id',
  start_lat: 'start_poi_latitude',
  start_lon: 'start_poi_longitude',
  end_lat: 'end_poi_latitude',
  end_lon: 'end_poi_longitude',
  waypoints: 'waypoints',
  image_border_color: 'image_border_color_hex',
  reversible: 'reversible',
})

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
  static async getAll(perms, args, { isMad }) {
    const { areaRestrictions } = perms
    const { onlyAreas, onlyDistance } = args.filters

    const distanceInMeters = (onlyDistance || [0.5, 100]).map((x) => x * 1000)

    const startLatitude = isMad ? 'start_poi_latitude' : 'start_lat'
    const startLongitude = isMad ? 'start_poi_longitude' : 'start_lon'
    const distanceMeters = isMad ? 'route_distance_meters' : 'distance_meters'
    const endLatitude = isMad ? 'end_poi_latitude' : 'end_lat'
    const endLongitude = isMad ? 'end_poi_longitude' : 'end_lon'

    const query = this.query()
      .select(isMad ? GET_MAD_ALL_SELECT : GET_ALL_SELECT)
      .whereBetween(startLatitude, [args.minLat, args.maxLat])
      .andWhereBetween(startLongitude, [args.minLon, args.maxLon])
      .andWhereBetween(distanceMeters, distanceInMeters)
      .union((qb) => {
        qb.select(isMad ? GET_MAD_ALL_SELECT : GET_ALL_SELECT)
          .whereBetween(endLatitude, [args.minLat, args.maxLat])
          .andWhereBetween(endLongitude, [args.minLon, args.maxLon])
          .andWhereBetween(distanceMeters, distanceInMeters)
          .from('route')

        getAreaSql(qb, areaRestrictions, onlyAreas, isMad, 'route_end')
      })

    if (!getAreaSql(query, areaRestrictions, onlyAreas, isMad, 'route_start')) {
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
  static async getOne(id, { isMad }) {
    /** @type {import('@rm/types').FullRoute} */
    const result = isMad
      ? await this.query()
          .select({
            id: 'route_id',
            name: 'name',
            description: 'description',
            distance_meters: 'route_distance_meters',
            duration_seconds: 'route_duration_seconds',
            start_fort_id: 'start_poi_fort_id',
            start_lat: 'start_poi_latitude',
            start_lon: 'start_poi_longitude',
            start_image: 'start_poi_image_url',
            end_fort_id: 'end_poi_fort_id',
            end_lat: 'end_poi_latitude',
            end_lon: 'end_poi_longitude',
            end_image: 'end_poi_image_url',
            image: 'image',
            image_border_color: 'image_border_color_hex',
            reversible: 'reversible',
            tags: 'tags',
            type: 'type',
            version: 'version',
            waypoints: 'waypoints',
          })
          .select(raw('UNIX_TIMESTAMP(last_updated)').as('updated'))
          .findOne({ route_id: id })
      : await this.query().findById(id)

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
  static async getFilterContext({ isMad }) {
    if (isMad) {
      const result = await this.query()
        .max('route_distance_meters AS max_distance')
        .max('route_duration_seconds AS max_duration')
        .first()

      // @ts-ignore
      return result
    }

    const result = await this.query()
      .max('distance_meters AS max_distance')
      .max('duration_seconds AS max_duration')
      .first()

    // @ts-ignore // shrug, I think we would TS to make this actually work
    return result
  }
}

module.exports = Route
