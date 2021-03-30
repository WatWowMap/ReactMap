import React from 'react'
import { Popup, Circle } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'

import Query from '../../services/Query'
import marker from './marker'
import PopupContent from './Popup'

export default function Spawnpoint({ bounds }) {
  const { data } = useQuery(Query.getAllSpawnpoints(), {
    variables: bounds,
  })

  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={16}
    >
      {data && data.spawnpoints.map(spawnpoint => (
        <Circle
          key={spawnpoint.id}
          center={[spawnpoint.lat, spawnpoint.lon]}
          radius={1}
          pathOptions={marker(spawnpoint)}
        >
          <Popup position={[spawnpoint.lat, spawnpoint.lon]}>
            <PopupContent spawnpoint={spawnpoint} />
          </Popup>
        </Circle>
      ))}
    </MarkerClusterGroup>
  )
}
