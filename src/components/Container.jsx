import React from 'react'
import { MapContainer } from 'react-leaflet'

import useGenerate from '@hooks/useGenerate'
import useRefresh from '@hooks/useRefresh'

import Map from './Map'

export default function Container({ serverSettings, params, location, zoom }) {
  useGenerate()
  useRefresh()

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
