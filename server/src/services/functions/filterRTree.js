const { default: pointInPolygon } = require('@turf/boolean-point-in-polygon')
const { point } = require('@turf/helpers')

const config = require('../config')
const { consolidateAreas } = require('./consolidateAreas')

/**
 * Filters via RTree in place of MySQL query when using in memory data
 * @template {{ lat?: number, lon?: number }} T
 * @param {T} item
 * @param {string[]} areaRestrictions
 * @param {string[]} onlyAreas
 * @returns {boolean}
 */
function filterRTree(item, areaRestrictions = [], onlyAreas = []) {
  if (!areaRestrictions.length && !onlyAreas.length) return true

  const consolidatedAreas = consolidateAreas(areaRestrictions, onlyAreas)

  if (!consolidatedAreas.size) return true

  const foundFeatures = config.areas.myRTree
    .search({
      x: item.lon || 0,
      y: item.lat || 0,
      w: 0,
      h: 0,
    })
    .filter((feature) => consolidatedAreas.has(feature.properties.key))

  const foundInRtree =
    foundFeatures.length &&
    foundFeatures.some((feature) =>
      pointInPolygon(point([item.lon || 0, item.lat || 0]), feature),
    )

  return foundInRtree
}

module.exports = { filterRTree }
