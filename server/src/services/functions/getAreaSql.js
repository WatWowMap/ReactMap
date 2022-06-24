const config = require('../config')
const areas = require('../areas')

module.exports = function getAreaRestrictionSql(
  query,
  areaRestrictions,
  onlyAreas,
  isMad,
  category,
) {
  if (!areaRestrictions?.length && (!onlyAreas?.length || config.manualAreas.length)) return true

  const cleanUserAreas = onlyAreas.filter((area) => areas.names.includes(area))
  const consolidatedAreas = areaRestrictions.length
    ? areaRestrictions.filter(
        (area) => !cleanUserAreas.length || cleanUserAreas.includes(area),
      )
    : cleanUserAreas

  if (!consolidatedAreas.length) return false

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
  }
  if (category === 's2cell') {
    columns = columns.map((each) => `center_${each}`)
  }

  query.andWhere((restrictions) => {
    consolidatedAreas.forEach((area) => {
      if (areas.polygons[area]) {
        const polygon = areas.polygons[area].map((e) => e.join(' ')).join()
        restrictions.orWhereRaw(
          `ST_CONTAINS(ST_GeomFromText("POLYGON((${polygon}))"), POINT(${columns[1]}, ${columns[0]}))`,
        )
      }
    })
  })
  return true
}
