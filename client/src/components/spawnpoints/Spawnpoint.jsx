import React from 'react'
import { Popup, CircleMarker } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'

import { useQuery } from '@apollo/client'
import Query from '../../services/Query.js'

import marker from './marker.js'
import PopupContent from './Popup.jsx'

const Spawnpoint = ({ bounds }) => {
  const { loading, error, data } = useQuery(Query.getAllSpawnpoints(), {
    variables: {
      minLat: bounds._southWest.lat,
      minLon: bounds._southWest.lng,
      maxLat: bounds._northEast.lat,
      maxLon: bounds._northEast.lng
    }
  })

  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={16}
    >
      {data && data.spawnpoints.map(spawnpoint => {
        return (
          <CircleMarker
            key={spawnpoint.id}
            center={[spawnpoint.lat, spawnpoint.lon]}
            radius={1}
            pathOptions={marker(spawnpoint)}>
            <Popup position={[spawnpoint.lat, spawnpoint.lon]}>
              <PopupContent spawnpoint={spawnpoint} />
            </Popup>
          </CircleMarker>
        )
      })}
    </MarkerClusterGroup>
  )
}

export default Spawnpoint
