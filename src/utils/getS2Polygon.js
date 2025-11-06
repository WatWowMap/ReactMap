// @ts-check
import { S2Cell, S2CellId, S2LatLng, S2Point } from 'nodes2ts'

/**
 * Convert an S2 cell into an array of lat/lon pairs describing its polygon.
 *
 * @param {S2CellId | string} cellId
 * @returns {import('@rm/types').S2Polygon | null}
 */
export const getS2Polygon = (cellId) => {
  try {
    const id = typeof cellId === 'string' ? new S2CellId(cellId) : cellId
    const cell = new S2Cell(id)
    /** @type {import('@rm/types').S2Polygon} */
    const polygon = []
    for (let i = 0; i < 4; i += 1) {
      const vertex = cell.getVertex(i)
      const point = new S2Point(vertex.x, vertex.y, vertex.z)
      const latLng = S2LatLng.fromPoint(point)
      polygon.push([latLng.latDegrees, latLng.lngDegrees])
    }
    return polygon
  } catch {
    return null
  }
}
