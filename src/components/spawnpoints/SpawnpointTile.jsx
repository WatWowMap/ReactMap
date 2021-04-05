import React from 'react'
import { Circle, Popup } from 'react-leaflet'
import PopupContent from './Popup'
import marker from './marker'

const SpawnpointTile = ({ spawnpoint }) => (
  <Circle
    center={[spawnpoint.lat, spawnpoint.lon]}
    radius={1}
    pathOptions={marker(spawnpoint)}
  >
    <Popup position={[spawnpoint.lat, spawnpoint.lon]}>
      <PopupContent spawnpoint={spawnpoint} />
    </Popup>
  </Circle>
)

const areEqual = (prevSpawnpoint, nextSpawnpoint) => (
  prevSpawnpoint.id === nextSpawnpoint.id
  && prevSpawnpoint.lat === nextSpawnpoint.lat
  && prevSpawnpoint.lon === nextSpawnpoint.lon
)

export default React.memo(SpawnpointTile, areEqual)
