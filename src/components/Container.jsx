import React from 'react'
import { MapContainer, Pane } from 'react-leaflet'

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
      {serverSettings.user && serverSettings.user.perms.map && (
        <Map serverSettings={serverSettings} params={params} />
      )}
      <Pane name="circlePane" style={{ zIndex: 450, pointerEvents: 'none' }} />
    </MapContainer>
  )
}
