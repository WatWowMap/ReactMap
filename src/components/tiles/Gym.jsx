import React, { memo } from 'react'
import { Marker, Popup } from 'react-leaflet'
import gymMarker from '../markers/gym'
import raidMarker from '../markers/raid'
import PopupContent from '../popups/Gym'

const GymTile = ({ item, ts }) => (
  <Marker
    position={[item.lat, item.lon]}
    icon={gymMarker(item, ts)}
  >
    {(item.raid_end_timestamp >= ts && item.raid_level > 0)
        && (
          <Marker
            key={`${item.id}-${item.raid_level}`}
            position={[item.lat, item.lon]}
            icon={raidMarker(item, ts)}
            className="marker"
          >
            <Popup position={[item.lat, item.lon]}>
              <PopupContent gym={item} />
            </Popup>
          </Marker>
        )}
    <Popup position={[item.lat, item.lon]}>
      <PopupContent gym={item} />
    </Popup>
  </Marker>
)

const areEqual = (prev, next) => (
  prev.item.id === next.item.id
  && prev.item.updated === next.item.updated
  && prev.item.raid_end_timestamp === next.item.raid_end_timestamp
)

export default memo(GymTile, areEqual)
