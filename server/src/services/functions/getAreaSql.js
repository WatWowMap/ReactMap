const areas = require('../areas.js')

module.exports = function getAreaRestrictionSql(query, areaRestrictions, isMad, category) {
  let columns = ['lat', 'lon']
  if (isMad && category !== 'device') {
    columns = ['latitude', 'longitude']
  }
  if (isMad && category === 'pokemon') {
    columns = columns.map(each => `pokemon.${each}`)
  }
  if (category === 's2cell') {
    columns = columns.map(each => `center_${each}`)
  }
  if (category === 'device') {
    columns = columns.map(each => `last_${each}`)
  }

  query.andWhere(restrictions => {
    areaRestrictions.forEach(area => {
      const polygon = areas.polygons[area].map(e => e.join(' ')).join()
      restrictions.orWhereRaw(`ST_CONTAINS(ST_GeomFromText("POLYGON((${polygon}))"), POINT(${columns[1]}, ${columns[0]}))`)
    })
  })
}
