// @ts-check
const config = require('@rm/config')
const { consolidateAreas } = require('./consolidateAreas')

/**
 *
 * @param {import('objection').QueryBuilder} query
 * @param {string[]} areaRestrictions
 * @param {string[]} onlyAreas
 * @param {boolean} [isMad]
 * @param {string} [category]
 * @returns
 */
function getAreaSql(
  query,
  areaRestrictions,
  onlyAreas,
  isMad = false,
  category = '',
) {
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
  if (isMad) {
    if (category === 'device') {
      columns = ['X(currentPos)', 'Y(currentPos)']
    } else {
      columns = ['latitude', 'longitude']
    }
    if (category === 'pokemon') {
      columns = columns.map((each) => `pokemon.${each}`)
    } else if (category === 'route_start') {
      columns = columns.map((each) => `start_poi_${each}`)
    } else if (category === 'route_end') {
      columns = columns.map((each) => `end_poi_${each}`)
    }
  } else if (category === 'device') {
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

/**
 * The deny half of getAreaSql, for the in-memory (filterRTree) path. filterRTree
 * returns true (allow-all) for empty inputs, so on its own it BYPASSES strict
 * area restrictions — a user with no assigned areas would see every fort. This
 * mirrors getAreaSql's two deny cases so an endpoint source can short-circuit to
 * an empty result exactly as the SQL query returns no rows:
 *   1. strict mode on, restrictions configured, and this user has none; or
 *   2. the user's areas don't resolve to any polygon.
 * @param {string[]} areaRestrictions
 * @param {string[]} onlyAreas
 * @returns {boolean} true when the request must yield no results
 */
function areaRestrictionsDenyAll(areaRestrictions = [], onlyAreas = []) {
  const authentication = config.getSafe('authentication')
  if (
    authentication.strictAreaRestrictions &&
    authentication.areaRestrictions.length &&
    !areaRestrictions.length
  )
    return true
  if (!areaRestrictions.length && !onlyAreas.length) return false
  return !consolidateAreas(areaRestrictions, onlyAreas).size
}

module.exports = { getAreaSql, areaRestrictionsDenyAll }
