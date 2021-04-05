/* eslint-disable no-unused-vars */
/* eslint-disable no-underscore-dangle */
import React, { useState, useEffect, useCallback } from 'react'
import { TileLayer } from 'react-leaflet'
import { ThemeProvider } from '@material-ui/styles'

import theme from '../assets/mui/theme'
import Nav from './layout/Nav'
import Device from './devices/Device'
import Gym from './gyms/GymQuery'
import Pokestop from './pokestops/PokestopQuery'
import Pokemon from './pokemon/PokemonQuery'
import Spawnpoint from './spawnpoints/SpawnpointQuery'
import Portal from './portals/PortalQuery'
import Weather from './weather/Weather'
import S2Cell from './s2Cell/S2CellQuery'
import SubmissionCell from './submissionCells/SubmissionCellQuery'

export default function Map({
  map, config, defaultFilters, settings, setSettings, availableForms, masterfile,
}) {
  const [bounds] = useState({
    minLat: config.map.startLat - 0.025,
    maxLat: config.map.startLat + 0.025,
    minLon: config.map.startLon - 0.025,
    maxLon: config.map.startLon + 0.025,
  })

  const [globalFilters, setGlobalFilters] = useState(JSON.parse(localStorage.getItem('filters')) || defaultFilters)

  useEffect(() => {
    localStorage.setItem('filters', JSON.stringify(globalFilters))
    localStorage.setItem('zoom', JSON.stringify(map.getZoom()))
    localStorage.setItem('location', JSON.stringify(map.getCenter()))
  }, [map.getZoom(), map.getCenter(), globalFilters])

  return (
    <ThemeProvider theme={theme}>
      <TileLayer
        key={settings.tileServer.name}
        attribution={settings.tileServer.attribution}
        url={settings.tileServer.url}
      />
      {globalFilters.devices.enabled
        && <Device filter={globalFilters.devices.filters} />}
      {(globalFilters.gyms.enabled || globalFilters.raids.enabled)
        && (
          <Gym
            bounds={bounds}
            settings={settings}
            availableForms={availableForms}
            globalFilters={globalFilters}
          />
        )}
      {globalFilters.pokestops.enabled
        && (
          <Pokestop
            bounds={bounds}
            settings={settings}
            availableForms={availableForms}
            globalFilters={globalFilters}
          />
        )}
      {globalFilters.pokemon.enabled
        && (
          <Pokemon
            bounds={bounds}
            settings={settings}
            availableForms={availableForms}
            filters={globalFilters.pokemon.filter}
          />
        )}
      {globalFilters.portals.enabled
        && (
          <Portal
            bounds={bounds}
          />
        )}
      {globalFilters.scanCells.enabled
        && (
          <S2Cell
            bounds={bounds}
          />
        )}
      {globalFilters.submissionCells.enabled
        && (
          <SubmissionCell
            bounds={bounds}
          />
        )}
      {globalFilters.spawnpoints.enabled
        && (
          <Spawnpoint
            bounds={bounds}
          />
        )}
      {globalFilters.weather.enabled
        && (
          <Weather
            bounds={bounds}
          />
        )}
      <Nav
        defaultFilters={defaultFilters}
        globalFilters={globalFilters}
        setGlobalFilters={setGlobalFilters}
        settings={settings}
        setSettings={setSettings}
        availableForms={availableForms}
        map={map}
        masterfile={masterfile}
      />
    </ThemeProvider>
  )
}
