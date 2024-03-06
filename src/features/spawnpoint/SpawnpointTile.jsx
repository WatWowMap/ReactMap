// @ts-check
/* eslint-disable react/destructuring-assignment */
import * as React from 'react'
import { Marker, Circle, Popup } from 'react-leaflet'

import { useMemory } from '@store/useMemory'

import { SpawnpointPopup } from './SpawnpointPopup'
import { spawnpointMarker } from './spawnpointMarker'

/**
 *
 * @param {import('@rm/types').Spawnpoint} item
 * @returns
 */
const BaseSpawnpointTile = (item) => {
  const Icons = useMemory((state) => state.Icons)
  const [modifiers] = Icons.getModifiers('spawnpoint')
  const size = Icons.getSize('spawnpoint') * modifiers.sizeMultiplier

  return modifiers.useImage ? (
    <Marker
      position={[item.lat, item.lon]}
      icon={spawnpointMarker(
        Icons.getSpawnpoints(!!item.despawn_sec),
        size * 6,
        modifiers,
      )}
    >
      <Popup position={[item.lat, item.lon]}>
        <SpawnpointPopup {...item} />
      </Popup>
    </Marker>
  ) : (
    <Circle
      center={[item.lat, item.lon]}
      radius={size}
      color={item.despawn_sec ? 'green' : 'red'}
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
