// @ts-check
const { Model, ref, raw } = require('objection')
const { polygon, point } = require('@turf/helpers')
const { default: booleanOverlap } = require('@turf/boolean-overlap')
const { default: pointInPolygon } = require('@turf/boolean-point-in-polygon')
const { default: booleanContains } = require('@turf/boolean-contains')
const config = require('@rm/config')

const getPolyVector = require('../services/functions/getPolyVector')

class Weather extends Model {
  static get tableName() {
    return 'weather'
  }

  /**
   * @param {import("@rm/types").Permissions} perms
   * @param {import('@rm/types').Bounds & { filters: { onlyAreas: string[] } } } args
   * @param {import('@rm/types').DbContext} ctx
   */
  static async getAll(perms, args, { isMad }) {
    const query = this.query().select([
      ref(isMad ? 's2_cell_id' : 'id')
        .castTo('CHAR')
        .as('id'),
    ])
    if (isMad) {
      query.select([
        'latitude',
        'longitude',
        'gameplay_weather AS gameplay_condition',
        raw('UNIX_TIMESTAMP(last_updated)').as('updated'),
      ])
    } else {
      query.select(['latitude', 'longitude', 'gameplay_condition', 'updated'])
      const ts = Math.floor(Date.now() / 1000)
      const ms = ts - config.getSafe('api.weatherCellLimit') * 60 * 60 * 24
      query.where('updated', '>=', ms)
    }
    /** @type {import("@rm/types").FullWeather[]} */
    const results = await query

    const areas = config.getSafe('areas')
    const cleanUserAreas = (args.filters.onlyAreas || []).filter((area) =>
      areas.names.has(area),
    )
    const merged = perms.areaRestrictions.length
      ? perms.areaRestrictions.filter(
          (area) => !cleanUserAreas.length || cleanUserAreas.includes(area),
        )
      : cleanUserAreas

    const boundPolygon = polygon([
      [
        [args.minLon, args.minLat],
        [args.maxLon, args.minLat],
        [args.maxLon, args.maxLat],
        [args.minLon, args.maxLat],
        [args.minLon, args.minLat],
      ],
    ])

    return results
      .map((cell) => {
        const center = point([cell.longitude, cell.latitude])
        const { polygon: poly, reverse } = getPolyVector(cell.id, true)
        const geojson = polygon([reverse])
        const hasOverlap =
          (pointInPolygon(center, boundPolygon) ||
            booleanOverlap(geojson, boundPolygon) ||
            booleanContains(geojson, boundPolygon)) &&
          (!merged.length ||
            merged.some(
              (area) =>
                areas.scanAreasObj[area] &&
                (pointInPolygon(center, areas.scanAreasObj[area]) ||
                  booleanOverlap(geojson, areas.scanAreasObj[area]) ||
                  pointInPolygon(
                    point(
                      // @ts-ignore // again, probably need real TS types
                      areas.scanAreasObj[area].geometry.type === 'MultiPolygon'
                        ? areas.scanAreasObj[area].geometry.coordinates[0][0][0]
                        : areas.scanAreasObj[area].geometry.coordinates[0][0],
                    ),
                    geojson,
                  )),
            ))
        return (
          hasOverlap && {
            ...cell,
            polygon: poly,
          }
        )
      })
      .filter(Boolean)
  }
}

module.exports = Weather
