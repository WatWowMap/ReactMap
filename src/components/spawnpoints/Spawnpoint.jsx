import React from 'react'
import { Popup, Circle } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'

import Query from '../../services/Query'
import marker from './marker'
import PopupContent from './Popup'

export default function Spawnpoint({ bounds }) {
  const { data, previousData } = useQuery(Query.getAllSpawnpoints(), {
    variables: bounds,
  })

  const renderedData = data || previousData
  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={16}
    >
      {renderedData && renderedData.spawnpoints.map(spawnpoint => (
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
