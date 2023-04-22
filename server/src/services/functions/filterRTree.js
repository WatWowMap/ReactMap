const config = require('../config')

module.exports = function getAreaRestrictionSql(
  item,
  areaRestrictions,
  onlyAreas,
) {
  if (!areaRestrictions?.length && !onlyAreas?.length) return true

  const cleanUserAreas = onlyAreas.filter((area) =>
    config.areas.names.has(area),
  )
  const consolidatedAreas = areaRestrictions.length
    ? areaRestrictions
        .filter(
          (area) => !cleanUserAreas.length || cleanUserAreas.includes(area),
        )
        .flatMap((area) => config.areas.withoutParents[area] || area)
    : cleanUserAreas

  const foundFeatures = config.areas.myRTree
    .search({
      x: item.lon,
      y: item.lat,
      w: 0,
      h: 0,
    })
    .map((feature) => feature?.properties?.name)
    .filter(Boolean)

  return (
    foundFeatures.length &&
    consolidatedAreas.some((area) => foundFeatures.includes(area))
  )
}
