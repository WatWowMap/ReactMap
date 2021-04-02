import React, { useState } from 'react'
import { MapContainer } from 'react-leaflet'

import Map from './Map'

export default function ConfigSettings({ serverSettings }) {
  const [map, setMap] = useState(null)
  const [settings, setSettings] = useState({
    iconStyle: serverSettings.config.icons.Default,
    tileServer: serverSettings.config.tileServers.Default,
  })

  const availableForms = new Set(settings.iconStyle.pokemonList)

  return (
    <>
      {serverSettings.config.map
        && (
        <MapContainer
          center={Object.values(JSON.parse(localStorage.getItem('location'))) || [serverSettings.config.map.startLat, serverSettings.config.map.startLon]}
          zoom={localStorage.getItem('zoom') || serverSettings.config.map.startZoom}
          whenCreated={setMap}
          zoomControl={false}
        >
          {map
            && (
            <Map
              map={map}
              config={serverSettings.config}
              settings={settings}
              setSettings={setSettings}
              defaultFilters={serverSettings.filters}
              availableForms={availableForms}
              masterfile={serverSettings.masterfile}
              preferCanvas
            />
            )}
        </MapContainer>
        )}
    </>
  )
}
