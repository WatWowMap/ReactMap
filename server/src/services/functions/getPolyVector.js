// @ts-check
const { S2LatLng, S2Cell, S2CellId, S2Point } = require('nodes2ts')

/**
 *
 * @param {S2CellId['id']} s2cellId
 * @param {number[][]} [polyline]
 * @returns
 */
function getPolyVector(s2cellId, polyline) {
  const s2cell = new S2Cell(new S2CellId(s2cellId.toString()))
  const poly = []
  const revPoly = []
  for (let i = 0; i <= 3; i += 1) {
    const coordinate = s2cell.getVertex(i)
    const point = new S2Point(coordinate.x, coordinate.y, coordinate.z)
    const latLng = S2LatLng.fromPoint(point)
    poly.push([latLng.latDegrees, latLng.lngDegrees])
    revPoly.push([latLng.lngDegrees, latLng.latDegrees])
  }
  if (polyline) {
    poly.push(poly[0])
    revPoly.push(revPoly[0])
  }

  return { poly, revPoly }
}

module.exports = getPolyVector
