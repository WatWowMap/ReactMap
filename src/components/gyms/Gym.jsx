import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'

import Query from '../../services/Query'
import gymMarker from './gymMarker'
import raidMarker from './raidMarker'
import PopupContent from './Popup'

export default function Gym({
  bounds, globalFilters, availableForms, settings,
}) {
  const { data } = !globalFilters.raids.enabled
    ? useQuery(Query.getAllGyms(), { variables: bounds })
    : useQuery(Query.getAllRaids(), { variables: bounds })
  const ts = (new Date()).getTime() / 1000

  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={13}
    >
      {data && data.gyms.map(gym => (
        <Marker
          key={gym.id}
          position={[gym.lat, gym.lon]}
          icon={gymMarker(settings, availableForms, gym, ts, globalFilters)}
        >
          {(gym.raid_end_timestamp >= ts && gym.raid_level > 0)
              && (
              <Marker
                key={`${gym.id}-${gym.raid_level}`}
                position={[gym.lat, gym.lon]}
                icon={raidMarker(settings, availableForms, gym, ts, globalFilters)}
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
      ))}
    </MarkerClusterGroup>
  )
}
