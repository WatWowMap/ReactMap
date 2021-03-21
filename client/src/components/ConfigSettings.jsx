import React, { useState } from 'react'
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client'
import { MapContainer } from 'react-leaflet'

import Map from './Map.jsx'
import buildDefaultFilters from '../services/defaultFilters/buildDefaultFilters.js'

const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache()
})

const ConfigSettings = ({ config }) => {
  const [map, setMap] = useState(null)
  const [settings, setSettings] = useState({
    iconStyle: config.icons.Default,
    tileServer: config.tileServers.Default
  })

  const defaultFilters = buildDefaultFilters(config)
  const availableForms = new Set(settings.iconStyle.pokemonList)

  return (
    <ApolloProvider client={client}>
      {config.map &&
        <MapContainer
          center={[config.map.startLat, config.map.startLon]}
          zoom={config.map.startZoom}
          whenCreated={setMap}
          zoomControl={false} >
          {map &&
            <Map
              map={map}
              config={config}
              settings={settings}
              setSettings={setSettings}
              defaultFilters={defaultFilters}
              availableForms={availableForms} />}
        </MapContainer>}
    </ApolloProvider>
  )
}

export default ConfigSettings