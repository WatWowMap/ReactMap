// @ts-check
/* eslint-disable react/destructuring-assignment */
import * as React from 'react'
import spawnpointMarker from '@components/markers/spawnpoints'
import { Marker, Circle, Popup } from 'react-leaflet'

import { useStatic } from '@hooks/useStore'
import PopupContent from '../popups/Spawnpoint'

/**
 *
 * @param {import('@rm/types').Spawnpoint} item
 * @returns
 */
const SpawnpointTile = (item) => {
  const Icons = useStatic((state) => state.Icons)
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
        <PopupContent {...item} />
      </Popup>
    </Marker>
  ) : (
    <Circle
      center={[item.lat, item.lon]}
      radius={size}
      color={item.despawn_sec ? 'green' : 'red'}
    >
      <Popup position={[item.lat, item.lon]}>
        <PopupContent {...item} />
      </Popup>
    </Circle>
  )
}
const MemoSpawnpoint = React.memo(
  SpawnpointTile,
  (prev, next) =>
    prev.despawn_sec === next.despawn_sec && prev.updated === next.updated,
)

export default MemoSpawnpoint
