import "../assets/scss/main.scss"

import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Switch, Route } from "react-router-dom"
import { hot } from "react-hot-loader/root.js"
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client'
import { MapContainer } from 'react-leaflet'

import Map from './Map.jsx'
import Fetch from '../services/Fetch.js'

const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache()
})

const App = props => {
  const [map, setMap] = useState(null)
  const [config, setConfig] = useState(undefined)
  const [zoom, setZoom] = useState(15)

  const getConfig = async () => {
    setConfig(await Fetch.fetchConfig())
  }

  useEffect(() => {
    getConfig()
  }, [])

  console.log(config)
  return (
    <Router>
      <Switch>
        <Route exact path="/">
          <ApolloProvider client={client}>
            {config &&
              <MapContainer
                center={[config.map.startLat, config.map.startLon]}
                zoom={config.map.startZoom}
                whenCreated={setMap}
                zoomControl={false} >
                {map &&
                  <Map
                    map={map}
                    config={config}
                    zoom={zoom}
                    setZoom={setZoom} />}
              </MapContainer>}
          </ApolloProvider>
        </Route>
      </Switch>
    </Router>
  )
}

export default hot(App)