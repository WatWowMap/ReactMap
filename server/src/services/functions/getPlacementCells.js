// @ts-check

const {
  S2LatLng,
  S2RegionCoverer,
  S2CellId,
  S2LatLngRect,
} = require('nodes2ts')
const getPolyVector = require('./getPolyVector')
const PoI = require('../../models/PoI')

/**
 *
 * @param {import('@rm/types').Bounds & { filters: { onlyRings: boolean, onlyS17Cells: boolean }}} filters
 * @param {import("@rm/types").Pokestop[]} pokestops
 * @param {import("@rm/types").Gym[]} gyms
 * @returns {{ level17Cells: import('@rm/types').Level17Cell[], pois: import('@rm/types').PoI[] }}}
 */
function getPlacementCells(filters, pokestops, gyms) {
  // dedupe poi entries
  const allCoords = Object.values(
    Object.fromEntries([...pokestops, ...gyms].map((poi) => [poi.id, poi])),
  )

  const regionCoverer = new S2RegionCoverer()
  regionCoverer.setMinLevel(17)
  regionCoverer.setMaxLevel(17)

  const region = S2LatLngRect.fromLatLng(
    S2LatLng.fromDegrees(filters.minLat, filters.minLon),
    S2LatLng.fromDegrees(filters.maxLat, filters.maxLon),
  )
  const indexedCells = {}
  const coveringCells = regionCoverer.getCoveringCells(region)
  for (let i = 0; i < coveringCells.length; i += 1) {
    const cell = coveringCells[i]
    const { polygon } = getPolyVector(cell.id)
    const cellId = cell.id.toString()
    indexedCells[cellId] = {
      id: cellId,
      level: 17,
      blocked: false,
      polygon,
    }
  }
  for (let i = 0; i < allCoords.length; i += 1) {
    const coords = allCoords[i]
    const level17Cell = S2CellId.fromPoint(
      S2LatLng.fromDegrees(coords.lat, coords.lon).toPoint(),
    ).parentL(17)
    const cellId = level17Cell.id.toString()
    const cell = indexedCells[cellId]
    if (cell) {
      cell.blocked = true
    }
  }

  return {
    level17Cells: filters.filters.onlyS17Cells
      ? Object.values(indexedCells)
      : [],
    pois: filters.filters.onlyRings
      ? allCoords.map((poi) => new PoI(poi.id, poi.lat, poi.lon))
      : [],
  }
}

module.exports = getPlacementCells
