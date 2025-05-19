// @ts-check
const config = require('@rm/config')
const { consolidateAreas } = require('./consolidateAreas')

/**
 *
 * @param {import('objection').QueryBuilder} query
 * @param {string[]} areaRestrictions
 * @param {string[]} onlyAreas
 * @param {string} [category]
 * @returns
 */
function getAreaSql(query, areaRestrictions, onlyAreas, category = '') {
  const authentication = config.getSafe('authentication')
  const areas = config.getSafe('areas')
  if (
    authentication.strictAreaRestrictions &&
    authentication.areaRestrictions.length &&
    !areaRestrictions.length
  )
    return false

  if (!areaRestrictions?.length && !onlyAreas?.length) return true

  const consolidatedAreas = consolidateAreas(areaRestrictions, onlyAreas)

  if (!consolidatedAreas.size) return false

  let columns = ['lat', 'lon']
  if (category === 'device') {
    columns = columns.map((each) => `last_${each}`)
  } else if (category === 's2cell') {
    columns = columns.map((each) => `center_${each}`)
  } else if (category === 'route_start') {
    columns = columns.map((each) => `start_${each}`)
  } else if (category === 'route_end') {
    columns = columns.map((each) => `end_${each}`)
  }

  query.andWhere((restrictions) => {
    consolidatedAreas.forEach((area) => {
      if (areas.polygons[area]) {
        restrictions.orWhereRaw(
          `ST_CONTAINS(ST_GeomFromGeoJSON('${JSON.stringify(
            areas.polygons[area],
          )}', 2, 0), POINT(${columns[1]}, ${columns[0]}))`,
        )
      }
    })
  })
  return true
}

module.exports = { getAreaSql }
