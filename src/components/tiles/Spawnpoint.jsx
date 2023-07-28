import spawnpointMarker from '@components/markers/spawnpoints'
import React, { memo } from 'react'
import { Marker, Circle, Popup } from 'react-leaflet'

import PopupContent from '../popups/Spawnpoint'

const SpawnpointTile = ({ item, Icons, ts }) => {
  const [modifiers] = Icons.getModifiers('spawnpoint')
  const popup = (
    <Popup position={[item.lat, item.lon]}>
      <PopupContent spawnpoint={item} ts={ts} />
    </Popup>
  )
  const size = Icons.getSize('spawnpoint') * modifiers.sizeMultiplier
  return modifiers.useImage ? (
    <Marker
      position={[item.lat, item.lon]}
      icon={spawnpointMarker(
        Icons.getSpawnpoints(item.despawn_sec),
        size * 6,
        modifiers,
      )}
    >
      {popup}
    </Marker>
  ) : (
    <Circle
      center={[item.lat, item.lon]}
      radius={size}
      pathOptions={{ color: item.despawn_sec ? 'green' : 'red' }}
    >
      {popup}
    </Circle>
  )
}
const areEqual = (prev, next) =>
  prev.item.id === next.item.id && prev.item.updated === next.item.updated

export default memo(SpawnpointTile, areEqual)
