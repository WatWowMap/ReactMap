const { Model, ref, raw } = require('objection')
const { polygon, point } = require('@turf/helpers')
const { default: booleanOverlap } = require('@turf/boolean-overlap')
const { default: pointInPolygon } = require('@turf/boolean-point-in-polygon')
const { default: booleanContains } = require('@turf/boolean-contains')

const getPolyVector = require('../services/functions/getPolyVector')
const config = require('../services/config')

const {
  api: { weatherCellLimit },
} = require('../services/config')

module.exports = class Weather extends Model {
  static get tableName() {
    return 'weather'
  }

  static async getAll(perms, args, { isMad }) {
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

    const cleanUserAreas = args.filters.onlyAreas.filter((area) =>
      config.areas.names.has(area),
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
        const { poly, revPoly } = getPolyVector(cell.id, true)
        const geojson = polygon([revPoly])
        const hasOverlap =
          (pointInPolygon(center, boundPolygon) ||
            booleanOverlap(geojson, boundPolygon) ||
            booleanContains(geojson, boundPolygon)) &&
          (!merged.length ||
            merged.some(
              (area) =>
                config.areas.scanAreasObj[area] &&
                (pointInPolygon(center, config.areas.scanAreasObj[area]) ||
                  booleanOverlap(geojson, config.areas.scanAreasObj[area]) ||
                  pointInPolygon(
                    point(
                      config.areas.scanAreasObj[area].geometry.type ===
                        'MultiPolygon'
                        ? config.areas.scanAreasObj[area].geometry
                            .coordinates[0][0][0]
                        : config.areas.scanAreasObj[area].geometry
                            .coordinates[0][0],
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
