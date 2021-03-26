import React, { useState } from 'react'
import { MapContainer } from 'react-leaflet'

import Map from './Map.jsx'
import buildDefaultFilters from '../services/defaultFilters/buildDefaultFilters.js'

const ConfigSettings = ({ serverSettings }) => {
  const [map, setMap] = useState(null)
  const [settings, setSettings] = useState({
    iconStyle: serverSettings.config.icons.Default,
    tileServer: serverSettings.config.tileServers.Default
  })

  const defaultFilters = buildDefaultFilters(serverSettings)
  const availableForms = new Set(settings.iconStyle.pokemonList)
  
  return (
    <>
      {serverSettings.config.map &&
        <MapContainer
          center={[serverSettings.config.map.startLat, serverSettings.config.map.startLon]}
          zoom={serverSettings.config.map.startZoom}
          whenCreated={setMap}
          zoomControl={false} >
          {map &&
            <Map
              map={map}
              config={serverSettings.config}
              settings={settings}
              setSettings={setSettings}
              defaultFilters={defaultFilters}
              availableForms={availableForms}
            />}
        </MapContainer>}
    </>
  )
}

export default ConfigSettings