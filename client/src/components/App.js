import React, { useState, useEffect } from 'react'
import { hot } from "react-hot-loader/root.js"
import "../assets/scss/main.scss"

import { MapContainer } from 'react-leaflet'
import MapTiles from './MapTiles.jsx'
import Fetch from '../services/Fetch.js'

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
    <>
      {settings && <MapContainer center={[settings.startLat, settings.startLon]} zoom={settings.startZoom} whenCreated={setMap} >
        {map ? <MapTiles map={map} settings={settings} /> : null}
      </MapContainer>}
    </>
  )
}

export default hot(App)