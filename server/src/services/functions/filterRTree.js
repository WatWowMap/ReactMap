const { default: pointInPolygon } = require('@turf/boolean-point-in-polygon')
const { point } = require('@turf/helpers')

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
    .filter((feature) => feature?.properties?.key)

  const foundInRtree =
    foundFeatures.length &&
    foundFeatures.some(
      (feature) =>
        consolidatedAreas.includes(feature.properties.key) &&
        pointInPolygon(point([item.lon, item.lat]), feature),
    )
  return foundInRtree
}
