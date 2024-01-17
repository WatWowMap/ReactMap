// @ts-check
const { default: destination } = require('@turf/destination')
const { point } = require('@turf/helpers')

/**
 *
 * @param {number} centerLat
 * @param {number} centerLon
 * @param {number} distanceKm
 * @returns
 */
function getBboxFromCenter(centerLat, centerLon, distanceKm) {
  const center = point([centerLon, centerLat])
  const [minLon, minLat] = destination(center, distanceKm, 225, {
    units: 'kilometers',
  }).geometry.coordinates
  const [maxLon, maxLat] = destination(center, distanceKm, 45, {
    units: 'kilometers',
  }).geometry.coordinates

  return {
    minLat,
    minLon,
    maxLat,
    maxLon,
  }
}

module.exports = {
  getBboxFromCenter,
}
