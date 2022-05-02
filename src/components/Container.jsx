import React from 'react'
import { MapContainer } from 'react-leaflet'
import { useStore } from '@hooks/useStore'

import Map from './Map'

export default function Container({ serverSettings, params }) {
  const location = useStore(state => state.location)
  const zoom = useStore(state => state.zoom)

  return (
    <MapContainer
      tap={false}
      center={location}
      zoom={zoom}
      zoomControl={false}
      preferCanvas
    >
      {(serverSettings.user && serverSettings.user.perms.map) && (
        <Map
          serverSettings={serverSettings}
          params={params}
        />
      )}
    </MapContainer>
  )
}
