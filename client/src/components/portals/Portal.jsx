import React from 'react'
import { Popup, CircleMarker } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'

import { useQuery } from '@apollo/client'
import Query from '../../services/Query.js'

import marker from './marker.js'
import PopupContent from './Popup.jsx'

const Portal = ({ bounds }) => {
  const { loading, error, data } = useQuery(Query.getAllPortals(), {
    variables: {
      minLat: bounds._southWest.lat,
      minLon: bounds._southWest.lng,
      maxLat: bounds._northEast.lat,
      maxLon: bounds._northEast.lng
    }
  })
  console.log(data)
  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={16}
    >
      {data && data.portals.map(portal => {
        return (
          <CircleMarker
            key={portal.id}
            center={[portal.lat, portal.lon]}
            radius={20}
            pathOptions={marker(portal)}>
            <Popup position={[portal.lat, portal.lon]}>
              <PopupContent portal={portal} />
            </Popup>
          </CircleMarker>
        )
      })}
    </MarkerClusterGroup>
  )
}

export default Portal
