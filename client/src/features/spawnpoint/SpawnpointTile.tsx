import * as React from 'react'
import { Marker, Circle, Popup } from 'react-leaflet'
import { useMemory } from '@store/useMemory'

import { SpawnpointPopup } from './SpawnpointPopup'
import { spawnpointMarker } from './spawnpointMarker'

const BaseSpawnpointTile = (item: import('@rm/types').Spawnpoint) => {
  const Icons = useMemory((s) => s.Icons)
  const [modifiers] = Icons.getModifiers('spawnpoint')
  const size = Icons.getSize('spawnpoint') * modifiers.sizeMultiplier

  return modifiers.useImage ? (
    <Marker
      icon={spawnpointMarker(
        Icons.getSpawnpoints(!!item.despawn_sec),
        size * 6,
        modifiers,
      )}
      position={[item.lat, item.lon]}
    >
      <Popup position={[item.lat, item.lon]}>
        <SpawnpointPopup {...item} />
      </Popup>
    </Marker>
  ) : (
    <Circle
      center={[item.lat, item.lon]}
      color={item.despawn_sec ? 'green' : 'red'}
      radius={size}
    >
      <Popup position={[item.lat, item.lon]}>
        <SpawnpointPopup {...item} />
      </Popup>
    </Circle>
  )
}

export const SpawnpointTile = React.memo(
  BaseSpawnpointTile,
  (prev, next) =>
    prev.despawn_sec === next.despawn_sec && prev.updated === next.updated,
)
