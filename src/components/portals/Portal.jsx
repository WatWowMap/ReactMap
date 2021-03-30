import React from 'react'
import { Popup, Circle } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'

import Query from '../../services/Query'
import marker from './marker'
import PopupContent from './Popup'

export default function Portal({ bounds }) {
  const { data } = useQuery(Query.getAllPortals(), {
    variables: bounds,
  })
  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={16}
    >
      {data && data.portals.map(portal => (
        <Circle
          key={portal.id}
          center={[portal.lat, portal.lon]}
          radius={20}
          pathOptions={marker(portal)}
        >
          <Popup position={[portal.lat, portal.lon]}>
            <PopupContent portal={portal} />
          </Popup>
        </Circle>
      ))}
    </MarkerClusterGroup>
  )
}
