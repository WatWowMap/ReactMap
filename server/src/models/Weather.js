const { Model, ref, raw } = require('objection')
const { polygon, point } = require('@turf/helpers')
const { default: pointInPolygon } = require('@turf/boolean-point-in-polygon')
const { default: booleanOverlap } = require('@turf/boolean-overlap')

const getPolyVector = require('../services/functions/getPolyVector')
const config = require('../services/config')
const areas = require('../services/areas')

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
      areas.names.includes(area),
    )
    const merged = perms.areaRestrictions.length
      ? perms.areaRestrictions.filter(
          (area) => !cleanUserAreas.length || cleanUserAreas.includes(area),
        )
      : cleanUserAreas

    return results
      .map((cell) => {
        const { poly, revPoly } = getPolyVector(cell.id, true)
        const geojson = polygon([revPoly])
        const hasOverlap =
          !merged.length ||
          merged.some(
            (area) =>
              pointInPolygon(
                point(config.scanAreasObj[area].geometry.coordinates[0][0]),
                geojson,
              ) ||
              pointInPolygon(
                point([cell.longitude, cell.latitude]),
                config.scanAreasObj[area],
              ) ||
              booleanOverlap(geojson, config.scanAreasObj[area]),
          )
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
