import "../assets/scss/main.scss"

import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Switch, Route } from "react-router-dom"
import { hot } from "react-hot-loader/root.js"
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client'
import { MapContainer } from 'react-leaflet'

import MapTiles from './MapTiles.jsx'
import Fetch from '../services/Fetch.js'

const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache()
})

const App = props => {
  const [map, setMap] = useState(null)
  const [settings, setSettings] = useState(undefined)
  const [zoom, setZoom] = useState(15)

  const getSettings = async () => {
    const body = (await Fetch.fetchSettings())
    setSettings(body)
    setZoom(body.map.startZoom)
  }

  useEffect(() => {
    getSettings()
  }, [])

  return (
    <Router>
      <Switch>
        <Route exact path="/">
          <ApolloProvider client={client}>
            {settings &&
              <MapContainer
                center={[settings.map.startLat, settings.map.startLon]}
                zoom={zoom}
                whenCreated={setMap}
                zoomControl={false} >
                {map &&
                  <MapTiles
                    map={map}
                    settings={settings}
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