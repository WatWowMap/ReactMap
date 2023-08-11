// @ts-check
const { point } = require('@turf/helpers')
const {
  default: booleanPointInPolygon,
} = require('@turf/boolean-point-in-polygon')
const config = require('config')

/**
 *
 * @param {[number, number]} center
 * @param {string[]} areaRestrictions
 * @returns {boolean}
 */
function checkAreaValidity(center, areaRestrictions) {
  /** @type {import('../areas').ScanAreasObj} */
  const scanAreasObj = config.get(`areas.scanAreasObj`)

  if (areaRestrictions?.length === 0) return true
  if (areaRestrictions?.length) {
    const testPoint = point([center[1], center[0]])
    for (let i = 0; i < areaRestrictions.length; i += 1) {
      const feature = scanAreasObj[areaRestrictions[i]]
      if (feature && booleanPointInPolygon(testPoint, feature)) {
        return true
      }
    }
  }
  return false
}

module.exports = checkAreaValidity
