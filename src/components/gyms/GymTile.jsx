import React, { memo } from 'react'
import { Marker, Popup } from 'react-leaflet'
import gymMarker from './gymMarker'
import raidMarker from './raidMarker'
import PopupContent from './Popup'

const GymTile = ({
  gym, ts,
}) => (
  <Marker
    position={[gym.lat, gym.lon]}
    icon={gymMarker(gym, ts)}
  >
    {(gym.raid_end_timestamp >= ts && gym.raid_level > 0)
        && (
          <Marker
            key={`${gym.id}-${gym.raid_level}`}
            position={[gym.lat, gym.lon]}
            icon={raidMarker(gym, ts)}
            className="marker"
          >
            <Popup position={[gym.lat, gym.lon]}>
              <PopupContent gym={gym} />
            </Popup>
          </Marker>
        )}
    <Popup position={[gym.lat, gym.lon]}>
      <PopupContent gym={gym} />
    </Popup>
  </Marker>
)

const areEqual = (prev, next) => (
  prev.gym.id === next.gym.id
  && prev.gym.updated === next.gym.updated
  && prev.gym.raid_end_timestamp === next.gym.raid_end_timestamp)

export default memo(GymTile, areEqual)
