import React, { useState, useEffect, useCallback } from 'react'
import { TileLayer } from 'react-leaflet'
import { ThemeProvider } from '@material-ui/styles'
import theme from './layout/theme.js'

import Device from './devices/Device.jsx'
import Gym from './gyms/Gym.jsx'
import Pokestop from './pokestops/Pokestop.jsx'
import Pokemon from './pokemon/Pokemon.jsx'
import Nav from './layout/Nav.jsx'
import Spawnpoint from './spawnpoints/Spawnpoint.jsx'
import Portal from './portals/Portal.jsx'
import Weather from './weather/Weather.jsx'
import S2Cell from './s2Cell/S2Cell.jsx'
import SubmissionCell from './submissionCells/SubmissionCells.jsx'

const Map = ({ map, config, defaultFilters, settings, setSettings, availableForms }) => {
  const [bounds, setBounds] = useState({
    minLat: config.map.startLat - 0.025,
    maxLat: config.map.startLat + 0.025,
    minLon: config.map.startLon - 0.025,
    maxLon: config.map.startLon + 0.025
  })
  const [globalFilters, setGlobalFilters] = useState(defaultFilters)

  const onMove = useCallback(() => {
    const mapBounds = map.getBounds()
    setBounds({
      minLat: mapBounds._southWest.lat - 0.01,
      maxLat: mapBounds._northEast.lat + 0.01,
      minLon: mapBounds._southWest.lng - 0.01,
      maxLon: mapBounds._northEast.lng + 0.01
    })
  }, [map])

  useEffect(() => {
    map.on('moveend', onMove)
    return () => {
      map.off('moveend', onMove)
    }
  }, [map, onMove])

  return (
    <ThemeProvider theme={theme}>
      <TileLayer
        key={settings.tileServer.name}
        attribution={settings.tileServer.attribution}
        url={settings.tileServer.url}
      />
      {globalFilters.devices.enabled &&
        <Device filter={globalFilters.devices.filters} />}
      {(globalFilters.gyms.enabled || globalFilters.raids.enabled) &&
        <Gym bounds={bounds} settings={settings} availableForms={availableForms} globalFilters={globalFilters}/>}
      {globalFilters.pokestops.enabled &&
        <Pokestop bounds={bounds} />}
      {globalFilters.pokemon.enabled &&
        <Pokemon bounds={bounds} settings={settings} availableForms={availableForms} filters={globalFilters.pokemon.filter} />}
      {globalFilters.portals.enabled &&
        <Portal bounds={bounds} />}
      {globalFilters.scanCells.enabled &&
        <S2Cell bounds={bounds} />}
      {globalFilters.submissionCells.enabled &&
        <SubmissionCell bounds={bounds} />}
      {globalFilters.spawnpoints.enabled &&
        <Spawnpoint bounds={bounds} />}
      {globalFilters.weather.enabled &&
        <Weather bounds={bounds} />}
      <Nav
        globalFilters={globalFilters}
        setGlobalFilters={setGlobalFilters}
        settings={settings}
        setSettings={setSettings}
        availableForms={availableForms}
        map={map}
      />
    </ThemeProvider>
  )
}

export default Map
