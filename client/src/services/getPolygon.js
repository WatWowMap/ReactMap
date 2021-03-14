import { S2LatLng, S2Cell, S2CellId, S2Point } from 'nodes2ts';

export default function (s2cellId) {
  const s2cell = new S2Cell(new S2CellId(BigInt(s2cellId).toString()))
  const polygon = []
  for (let i = 0; i <= 3; i++) {
    const coordinate = s2cell.getVertex(i)
    const point = new S2Point(coordinate.x, coordinate.y, coordinate.z)
    const latLng = S2LatLng.fromPoint(point)
    polygon.push([
      latLng.latDegrees,
      latLng.lngDegrees
    ])
  }

  return polygon
}
