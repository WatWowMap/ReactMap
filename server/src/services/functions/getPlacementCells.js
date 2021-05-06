/* global BigInt */

const {
  S2LatLng, S2RegionCoverer, S2CellId, S2LatLngRect,
} = require('nodes2ts')
const getPolyVector = require('./getPolyVector')
const { Ring } = require('../../models/index')

module.exports = function getPlacementCells(bounds, pokestops, gyms) {
  const allCoords = [...pokestops, ...gyms]

  const regionCoverer = new S2RegionCoverer()
  regionCoverer.minLevel = 17
  regionCoverer.maxLevel = 17
  const region = S2LatLngRect.fromLatLng(
    S2LatLng.fromDegrees(bounds.minLat, bounds.minLon),
    S2LatLng.fromDegrees(bounds.maxLat, bounds.maxLon),
  )
  const indexedCells = {}
  const coveringCells = regionCoverer.getCoveringCells(region)
  for (let i = 0; i < coveringCells.length; i += 1) {
    const cell = coveringCells[i]
    const polygon = getPolyVector(cell.id)
    const cellId = BigInt(cell.id).toString()
    indexedCells[cellId] = {
      id: cellId,
      level: 17,
      blocked: false,
      polygon,
    }
  }
  for (let i = 0; i < allCoords.length; i += 1) {
    const coords = allCoords[i]
    const level17Cell = S2CellId.fromPoint(S2LatLng.fromDegrees(coords.lat, coords.lon).toPoint()).parentL(17)
    const cellId = BigInt(level17Cell.id).toString()
    const cell = indexedCells[cellId]
    if (cell) {
      cell.blocked = true
    }
  }
  const rings = allCoords.map(poi => new Ring(poi.id, poi.lat, poi.lon, 20))

  return {
    cells: Object.values(indexedCells),
    rings,
  }
}
