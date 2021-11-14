const { discord: { skipAreaRestrictionPerms } } = require('../config')
const areas = require('../areas')

module.exports = function getAreaRestrictionSql(query, areaRestrictions, isMad, category) {
  if (areaRestrictions.length == 0 || skipAreaRestrictionPerms.includes(category)) return

  let columns = ['lat', 'lon']
  if (isMad) {
    if (category === 'devices') {
      columns = ['X(currentPos)', 'Y(currentPos)']
    } else {
      columns = ['latitude', 'longitude']
    }
    if (category === 'pokemon') {
      columns = columns.map(each => `pokemon.${each}`)
    }
  } else if (category === 'devices') {
    columns = columns.map(each => `last_${each}`)
  }
  if (category === 's2cells') {
    columns = columns.map(each => `center_${each}`)
  }

  query.andWhere(restrictions => {
    areaRestrictions.forEach(area => {
      const polygon = areas.polygons[area].map(e => e.join(' ')).join()
      restrictions.orWhereRaw(`ST_CONTAINS(ST_GeomFromText("POLYGON((${polygon}))"), POINT(${columns[1]}, ${columns[0]}))`)
    })
  })
}
