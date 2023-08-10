const config = require('../config')
const { consolidateAreas } = require('./consolidateAreas')

module.exports = function getAreaRestrictionSql(
  query,
  areaRestrictions,
  onlyAreas,
  isMad,
  category,
) {
  if (
    config.authentication.strictAreaRestrictions &&
    config.authentication.areaRestrictions.length &&
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
      if (config.areas.polygons[area]) {
        restrictions.orWhereRaw(
          `ST_CONTAINS(ST_GeomFromGeoJSON('${JSON.stringify(
            config.areas.polygons[area],
          )}', 2, 0), POINT(${columns[1]}, ${columns[0]}))`,
        )
      }
    })
  })
  return true
}
