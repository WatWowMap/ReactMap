import React, { useCallback } from 'react'
import { TileLayer, useMap } from 'react-leaflet'
import { ThemeProvider } from '@material-ui/styles'
import useStore from '../hooks/useStore'

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
  settings, setSettings,
}) {
  const map = useMap()
  const filters = useStore(state => state.filters)
  const initialBounds = {
    minLat: map.getBounds()._southWest.lat,
    maxLat: map.getBounds()._northEast.lat,
    minLon: map.getBounds()._southWest.lng,
    maxLon: map.getBounds()._northEast.lng,
  }

  const onMove = useCallback(() => {
    const newCenter = map.getCenter()
    localStorage.setItem('location', JSON.stringify([newCenter.lat, newCenter.lng]))
    localStorage.setItem('zoom', map.getZoom())
  }, [map])

  return (
    <ThemeProvider theme={theme}>
      <TileLayer
        key={settings.tileServer.name}
        attribution={settings.tileServer.attribution}
        url={settings.tileServer.url}
      />
      {filters.devices.enabled
        && <Device filter={filters.devices.filters} />}
      {(filters.gyms.enabled || filters.raids.enabled)
        && (
          <Gym
            bounds={initialBounds}
            filters={filters}
            onMove={onMove}
          />
        )}
      {filters.pokestops.enabled
        && (
          <Pokestop
            bounds={initialBounds}
            filters={filters}
            onMove={onMove}
          />
        )}
      {filters.pokemon.enabled
        && (
          <Pokemon
            bounds={initialBounds}
            filters={filters.pokemon.filter}
            onMove={onMove}
          />
        )}
      {filters.portals.enabled
        && (
          <Portal
            bounds={initialBounds}
            onMove={onMove}
          />
        )}
      {filters.scanCells.enabled
        && (
          <S2Cell
            bounds={initialBounds}
            onMove={onMove}
          />
        )}
      {filters.submissionCells.enabled
        && (
          <SubmissionCell
            bounds={initialBounds}
            onMove={onMove}
          />
        )}
      {filters.spawnpoints.enabled
        && (
          <Spawnpoint
            bounds={initialBounds}
            onMove={onMove}
          />
        )}
      {filters.weather.enabled
        && (
          <Weather />
        )}
      <Nav
        settings={settings}
        setSettings={setSettings}
      />
    </ThemeProvider>
  )
}
