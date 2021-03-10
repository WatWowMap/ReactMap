import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Switch, Route } from "react-router-dom"
import { hot } from "react-hot-loader/root.js"
import "../assets/scss/main.scss"

import { MapContainer } from 'react-leaflet'
import MapTiles from './MapTiles.jsx'
import Fetch from '../services/Fetch.js'
import Navbar from './layout/Navbar.jsx'

import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client'

const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache()
})

const App = props => {
  const [map, setMap] = useState(null)
  const [settings, setSettings] = useState(undefined)

  const getSettings = async () => {
    const body = (await Fetch.fetchSettings())
    setSettings(body)
  }

  useEffect(() => {
    getSettings()
  }, [])

  return (
    <ApolloProvider client={client}>
      <Router>
        <Navbar />
        <Switch>
          <Route exact path="/">
            {settings && <MapContainer center={[settings.startLat, settings.startLon]} zoom={settings.startZoom} whenCreated={setMap} >
              {map ? <MapTiles map={map} settings={settings} /> : null}
            </MapContainer>}
          </Route>
        </Switch>
      </Router>
    </ApolloProvider>
  )
}

export default hot(App)