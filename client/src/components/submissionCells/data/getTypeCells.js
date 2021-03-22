import { S2LatLng, S2RegionCoverer, S2CellId, S2LatLngRect } from 'nodes2ts'
import Utility from '../../../services/Utility.js'

export default function (bounds, pokestops, gyms) {
  const allStops = pokestops.filter(x => x.sponsor_id === null || x.sponsor_id === 0)
  const allGyms = gyms.filter(x => x.sponsor_id === null || x.sponsor_id === 0)
  const stopCoords = allStops.map(x => { return { 'lat': x.lat, 'lon': x.lon } })
  const gymCoords = allGyms.map(x => { return { 'lat': x.lat, 'lon': x.lon } })

  const regionCoverer = new S2RegionCoverer()
  regionCoverer.minLevel = 14
  regionCoverer.maxLevel = 14
  const region = S2LatLngRect.fromLatLng(
    S2LatLng.fromDegrees(bounds.minLat, bounds.minLon),
    S2LatLng.fromDegrees(bounds.maxLat, bounds.maxLon)
  )
  const indexedCells = {}
  const coveringCells = regionCoverer.getCoveringCells(region)
  for (let i = 0; i < coveringCells.length; i++) {
    const cell = coveringCells[i]
    const polygon = Utility.getPolyVector(cell.id)
    const cellId = BigInt(cell.id).toString()
    indexedCells[cellId] = {
      'id': cellId,
      'level': 14,
      'count': 0,
      'count_pokestops': 0,
      'count_gyms': 0,
      'polygon': polygon
    }
  }
  for (let i = 0; i < gymCoords.length; i++) {
    const coord = gymCoords[i]
    const level14Cell = S2CellId.fromPoint(S2LatLng.fromDegrees(coord.lat, coord.lon).toPoint()).parentL(14)
    const cellId = BigInt(level14Cell.id).toString()
    const cell = indexedCells[cellId]
    if (cell) {
      cell.count_gyms++
      cell.count++
    }
  }
  for (let i = 0; i < stopCoords.length; i++) {
    const coord = stopCoords[i]
    const level14Cell = S2CellId.fromPoint(S2LatLng.fromDegrees(coord.lat, coord.lon).toPoint()).parentL(14)
    const cellId = BigInt(level14Cell.id).toString()
    const cell = indexedCells[cellId]
    if (cell) {
      cell.count_pokestops++
      cell.count++
    }
  }
  return Object.values(indexedCells)
}