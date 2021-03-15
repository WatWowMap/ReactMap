import React from 'react'
import { Popup, Circle } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'

import { useQuery } from '@apollo/client'
import Query from '../../services/Query.js'

import marker from './marker.js'
import PopupContent from './Popup.jsx'

const Spawnpoint = ({ bounds }) => {
  const { loading, error, data } = useQuery(Query.getAllSpawnpoints(), {
    variables: bounds
  })

  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={16}
    >
      {data && data.spawnpoints.map(spawnpoint => {
        return (
          <Circle
            key={spawnpoint.id}
            center={[spawnpoint.lat, spawnpoint.lon]}
            radius={1}
            pathOptions={marker(spawnpoint)}>
            <Popup position={[spawnpoint.lat, spawnpoint.lon]}>
              <PopupContent spawnpoint={spawnpoint} />
            </Popup>
          </Circle>
        )
      })}
    </MarkerClusterGroup>
  )
}

export default Spawnpoint
