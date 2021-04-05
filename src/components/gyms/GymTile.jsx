import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import gymMarker from './gymMarker'
import raidMarker from './raidMarker'
import PopupContent from './Popup'

const GymTile = ({
  gym, availableForms, settings, ts,
}) => (
  <Marker
    position={[gym.lat, gym.lon]}
    icon={gymMarker(settings, availableForms, gym, ts)}
  >
    {(gym.raid_end_timestamp >= ts && gym.raid_level > 0)
        && (
          <Marker
            key={`${gym.id}-${gym.raid_level}`}
            position={[gym.lat, gym.lon]}
            icon={raidMarker(settings, availableForms, gym, ts)}
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

const areEqual = (prevGym, nextGym) => (
  prevGym.id === nextGym.id
  && prevGym.lat === nextGym.lat
  && prevGym.lon === nextGym.lon
)

export default React.memo(GymTile, areEqual)
