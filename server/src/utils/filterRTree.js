// @ts-check
const { default: pointInPolygon } = require('@turf/boolean-point-in-polygon')
const { point } = require('@turf/helpers')

const config = require('@rm/config')
const { consolidateAreas } = require('./consolidateAreas')
const { hasUnrestrictedAreaGrant } = require('./areaPerms')

/**
 * Filters via RTree in place of MySQL query when using in memory data
 * @template {{ lat?: number, lon?: number }} T
 * @param {T} item
 * @param {string[]} areaRestrictions
 * @param {string[]} onlyAreas
 * @returns {boolean}
 */
function filterRTree(item, areaRestrictions = [], onlyAreas = []) {
  const unrestrictedAreaGrant = hasUnrestrictedAreaGrant(areaRestrictions)
  if (unrestrictedAreaGrant && !onlyAreas.length) return true
  if (!areaRestrictions.length && !onlyAreas.length) return true

  const consolidatedAreas = consolidateAreas(
    unrestrictedAreaGrant ? [] : areaRestrictions,
    onlyAreas,
  )

  if (!consolidatedAreas.size) return false
  const areaRefs = new Set(
    [...consolidatedAreas].map(
      (feature) =>
        `${feature.properties.key || ''}:${feature.properties.parent || ''}:${feature.properties.name || ''}`,
    ),
  )

  /** @type {import("@rm/types").RMGeoJSON['features']} */
  const foundFeatures = config
    .getSafe('areas.myRTree')
    .search({
      x: item.lon || 0,
      y: item.lat || 0,
      w: 0,
      h: 0,
    })
    .filter((feature) =>
      areaRefs.has(
        `${feature.properties.key || ''}:${feature.properties.parent || ''}:${feature.properties.name || ''}`,
      ),
    )

  const foundInRtree =
    foundFeatures.length &&
    foundFeatures.some((feature) =>
      pointInPolygon(point([item.lon || 0, item.lat || 0]), feature),
    )

  return foundInRtree
}

module.exports = { filterRTree }
