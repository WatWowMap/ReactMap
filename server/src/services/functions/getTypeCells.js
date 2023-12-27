// @ts-check
const {
  S2LatLng,
  S2RegionCoverer,
  S2CellId,
  S2LatLngRect,
} = require('nodes2ts')
const getPolyVector = require('./getPolyVector')

/**
 *
 * @param {import('@rm/types').Bounds & { filters: { onlyS14Cells: boolean }}} filters
 * @param {import("@rm/types").Pokestop[]} pokestops
 * @param {import("@rm/types").Gym[]} gyms
 * @returns {import('@rm/types').Level14Cell[]}
 */
function getTypeCells(filters, pokestops, gyms) {
  if (!filters.filters.onlyS14Cells) return []

  const regionCoverer = new S2RegionCoverer()
  regionCoverer.setMinLevel(14)
  regionCoverer.setMaxLevel(14)
  const region = S2LatLngRect.fromLatLng(
    S2LatLng.fromDegrees(filters.minLat, filters.minLon),
    S2LatLng.fromDegrees(filters.maxLat, filters.maxLon),
  )
  /** @type {Record<string, import('@rm/types').Level14Cell>} */
  const indexedCells = {}
  const coveringCells = regionCoverer.getCoveringCells(region)
  for (let i = 0; i < coveringCells.length; i += 1) {
    const cell = coveringCells[i]
    const { polygon } = getPolyVector(cell.id)
    const cellId = cell.id.toString()
    indexedCells[cellId] = {
      id: cellId,
      // level: 14,
      count_pokestops: 0,
      count_gyms: 0,
      polygon,
    }
  }
  const seemGyms = new Set()
  for (let i = 0; i < gyms.length; i += 1) {
    const coords = gyms[i]
    const level14Cell = S2CellId.fromPoint(
      S2LatLng.fromDegrees(coords.lat, coords.lon).toPoint(),
    ).parentL(14)
    const cellId = level14Cell.id.toString()
    const cell = indexedCells[cellId]
    if (cell) {
      cell.count_gyms += 1
    }
    seemGyms.add(coords.id)
  }
  for (let i = 0; i < pokestops.length; i += 1) {
    const coords = pokestops[i]
    if (!seemGyms.has(coords.id)) {
      const level14Cell = S2CellId.fromPoint(
        S2LatLng.fromDegrees(coords.lat, coords.lon).toPoint(),
      ).parentL(14)
      const cellId = level14Cell.id.toString()
      const cell = indexedCells[cellId]
      if (cell) {
        cell.count_pokestops += 1
      }
    }
  }
  return Object.values(indexedCells)
}

module.exports = getTypeCells
