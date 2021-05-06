import React, { memo } from 'react'
import { Circle, Popup } from 'react-leaflet'
import PopupContent from '../popups/Spawnpoint'
import marker from '../markers/spawnpoint'

const SpawnpointTile = ({ item }) => (
  <Circle
    center={[item.lat, item.lon]}
    radius={1}
    pathOptions={marker(item)}
  >
    <Popup position={[item.lat, item.lon]}>
      <PopupContent spawnpoint={item} />
    </Popup>
  </Circle>
)

const areEqual = (prev, next) => (
  prev.item.id === next.item.id
  && prev.item.updated === next.item.updated
)

export default memo(SpawnpointTile, areEqual)
