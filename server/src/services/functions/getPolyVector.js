// @ts-check
const { S2LatLng, S2Cell, S2CellId, S2Point } = require('nodes2ts')
const NodeCache = require('node-cache')

const cache = new NodeCache({ stdTTL: 60 * 60 })

/**
 *
 * @param {S2CellId['id'] | string} s2cellId
 * @param {boolean} [polyline]
 * @returns {{ polygon: import('@rm/types').S2Polygon, reverse: import('@rm/types').S2Polygon }}
 */
function getPolyVector(s2cellId, polyline = false) {
  const cellIDString = s2cellId.toString()
  if (cache.has(cellIDString)) {
    return cache.get(cellIDString)
  }

  const s2cell = new S2Cell(new S2CellId(cellIDString))

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
  const result = { polygon, reverse }
  cache.set(cellIDString, result)
  return result
}

module.exports = getPolyVector
