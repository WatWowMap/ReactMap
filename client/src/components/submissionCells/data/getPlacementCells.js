import { S2LatLng, S2RegionCoverer, S2CellId, S2LatLngRect } from 'nodes2ts'
import Utility from '../../../services/Utility.js'
import Ring from './Ring.js'

export default function (bounds, pokestops, gyms) {
  const allStops = pokestops.filter(x => x.sponsor_id === null || x.sponsor_id === 0)
  const allGyms = gyms.filter(x => x.sponsor_id === null || x.sponsor_id === 0)
  const stopCoords = allStops.map(x => { return { 'lat': x.lat, 'lon': x.lon } })
  const gymCoords = allGyms.map(x => { return { 'lat': x.lat, 'lon': x.lon } })
  const allCoords = gymCoords.concat(stopCoords)

  const regionCoverer = new S2RegionCoverer()
  regionCoverer.minLevel = 17
  regionCoverer.maxLevel = 17
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
      'level': 17,
      'blocked': false,
      'polygon': polygon
    }
  }
  for (let i = 0; i < allCoords.length; i++) {
    const coord = allCoords[i]
    const level17Cell = S2CellId.fromPoint(S2LatLng.fromDegrees(coord.lat, coord.lon).toPoint()).parentL(17)
    const cellId = BigInt(level17Cell.id).toString()
    const cell = indexedCells[cellId]
    if (cell) {
      cell.blocked = true
    }
  }
  const rings = allCoords.map(x => new Ring(x.lat, x.lon, 20))
  
  return {
    cells: Object.values(indexedCells),
    rings: rings
  }
}