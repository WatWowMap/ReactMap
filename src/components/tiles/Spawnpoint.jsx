import React, { memo } from 'react'
import { Circle, Popup } from 'react-leaflet'

import PopupContent from '../popups/Spawnpoint'

const SpawnpointTile = ({ item, Icons, ts }) => (
  <Circle
    center={[item.lat, item.lon]}
    radius={Icons.getSize('spawnpoint')}
    pathOptions={{ color: item.despawn_sec ? 'green' : 'red' }}
  >
    <Popup position={[item.lat, item.lon]}>
      <PopupContent spawnpoint={item} ts={ts} />
    </Popup>
  </Circle>
)

const areEqual = (prev, next) => (
  prev.item.id === next.item.id
  && prev.item.updated === next.item.updated
)

export default memo(SpawnpointTile, areEqual)
