import { S2LatLng, S2Cell, S2CellId, S2Point } from 'nodes2ts';

export default function (s2cellId) {
  let s2cell = new S2Cell(new S2CellId(BigInt(s2cellId).toString()))
  let polygon = []
  for (let i = 0; i <= 3; i++) {
    let coordinate = s2cell.getVertex(i)
    let point = new S2Point(coordinate.x, coordinate.y, coordinate.z)
    let latLng = S2LatLng.fromPoint(point)
    let latitude = latLng.latDegrees
    let longitude = latLng.lngDegrees

    polygon.push([
      latitude,
      longitude
    ])
  }

  return polygon
}
