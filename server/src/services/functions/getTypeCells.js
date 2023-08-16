// @ts-check
const {
  S2LatLng,
  S2RegionCoverer,
  S2CellId,
  S2LatLngRect,
} = require('nodes2ts')
const getPolyVector = require('./getPolyVector')

/**
 * @typedef {{ id: string, level: number, count: number, count_pokestops: number, count_gyms: number, polygon: number[][] }} ReturnObj
 * @param {{ minLat: number, maxLat: number, minLon: number, maxLon: number }} bounds
 * @param {import('types').Pokestop[]} pokestops
 * @param {import('types').Gym[]} gyms
 * @returns {ReturnObj[]}
 */
function getTypeCells(bounds, pokestops, gyms) {
  const regionCoverer = new S2RegionCoverer()
  regionCoverer.setMinLevel(14)
  regionCoverer.setMaxLevel(14)
  const region = S2LatLngRect.fromLatLng(
    S2LatLng.fromDegrees(bounds.minLat, bounds.minLon),
    S2LatLng.fromDegrees(bounds.maxLat, bounds.maxLon),
  )
  /** @type {Record<string, ReturnObj>} */
  const indexedCells = {}
  const coveringCells = regionCoverer.getCoveringCells(region)
  for (let i = 0; i < coveringCells.length; i += 1) {
    const cell = coveringCells[i]
    const { poly } = getPolyVector(cell.id)
    const cellId = cell.id.toString()
    indexedCells[cellId] = {
      id: cellId,
      level: 14,
      count: 0,
      count_pokestops: 0,
      count_gyms: 0,
      polygon: poly,
    }
  }
  for (let i = 0; i < gyms.length; i += 1) {
    const coords = gyms[i]
    const level14Cell = S2CellId.fromPoint(
      S2LatLng.fromDegrees(coords.lat, coords.lon).toPoint(),
    ).parentL(14)
    const cellId = level14Cell.id.toString()
    const cell = indexedCells[cellId]
    if (cell) {
      cell.count_gyms += 1
      cell.count += 1
    }
  }
  for (let i = 0; i < pokestops.length; i += 1) {
    const coords = pokestops[i]
    const level14Cell = S2CellId.fromPoint(
      S2LatLng.fromDegrees(coords.lat, coords.lon).toPoint(),
    ).parentL(14)
    const cellId = level14Cell.id.toString()
    const cell = indexedCells[cellId]
    if (cell) {
      cell.count_pokestops += 1
      cell.count += 1
    }
  }
  return Object.values(indexedCells)
}

module.exports = getTypeCells
