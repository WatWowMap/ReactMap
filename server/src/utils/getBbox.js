// @ts-check
const { default: destination } = require('@turf/destination')
const { point, polygon } = require('@turf/helpers')

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

/**
 *
 * @param {import('@rm/types/lib').BBox} args
 */
function getPolygonBbox(args) {
  return polygon([
    [
      [args.minLon, args.minLat],
      [args.maxLon, args.minLat],
      [args.maxLon, args.maxLat],
      [args.minLon, args.maxLat],
      [args.minLon, args.minLat],
    ],
  ])
}

module.exports = {
  getBboxFromCenter,
  getPolygonBbox,
}
