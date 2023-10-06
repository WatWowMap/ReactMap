// @ts-check
const { S2LatLng, S2Cell, S2CellId, S2Point } = require('nodes2ts')

/**
 *
 * @param {S2CellId['id'] | string} s2cellId
 * @param {boolean} [polyline]
 * @returns {{ polygon: import('@rm/types').S2Polygon, reverse: import('@rm/types').S2Polygon }}
 */
function getPolyVector(s2cellId, polyline = false) {
  const s2cell = new S2Cell(new S2CellId(s2cellId.toString()))

  const polygon = /** @type {import('@rm/types').S2Polygon} */ ([])
  const reverse = /** @type {import('@rm/types').S2Polygon} */ ([])
  for (let i = 0; i <= 3; i += 1) {
    const coordinate = s2cell.getVertex(i)
    const point = new S2Point(coordinate.x, coordinate.y, coordinate.z)
    const latLng = S2LatLng.fromPoint(point)
    polygon.push([latLng.latDegrees, latLng.lngDegrees])
    reverse.push([latLng.lngDegrees, latLng.latDegrees])
  }
  if (polyline) {
    polygon.push(polygon[0])
    reverse.push(reverse[0])
  }

  return { polygon, reverse }
}

module.exports = getPolyVector
