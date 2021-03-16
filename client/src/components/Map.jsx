import React, { useState, useEffect, useCallback } from 'react'
import { TileLayer, ZoomControl } from 'react-leaflet'
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

const MapTiles = ({ map, config }) => {
  const [bounds, setBounds] = useState({
    minLat: config.map.startLat - 0.025,
    maxLat: config.map.startLat + 0.025,
    minLon: config.map.startLon - 0.025,
    maxLon: config.map.startLon + 0.025
  })
  const [selected, setSelected] = useState({
    gyms: config.map.filters.gyms,
    raids: config.map.filters.raids,
    pokestops: config.map.filters.pokestops,
    quests: config.map.filters.quests,
    invasions: config.map.filters.invasions,
    spawnpoints: config.map.filters.spawnpoints,
    pokemon: config.map.filters.pokemon,
    portals: config.map.filters.portals,
    scanCells: config.map.filters.scanCells,
    submissionCells: config.map.filters.submissionCells,
    weather: config.map.filters.weather,
    scanAreas: config.map.filters.scanAreas,
    devices: config.map.filters.devices
  })
  const [settings, setSettings] = useState({
    iconStyle: config.icons.Default,
    tileServer: config.tileServers.Default
  })

  const availableForms = new Set(settings.iconStyle.pokemonList)

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
    <>
      <TileLayer
        key={settings.tileServer.name}
        attribution={settings.tileServer.attribution}
        url={settings.tileServer.url}
      />
      <ZoomControl position='topright' zoomInText='+' zoomOutText='-' />
      {selected.devices && <Device />}
      {selected.gyms && <Gym bounds={bounds} />}
      {selected.pokestops && <Pokestop bounds={bounds} />}
      {selected.pokemon && <Pokemon bounds={bounds} settings={settings} availableForms={availableForms}/>}
      {selected.portals && <Portal bounds={bounds} />}
      {selected.scanCells && <S2Cell bounds={bounds} />}
      {selected.submissionCells && <SubmissionCell bounds={bounds} />}
      {selected.spawnpoints && <Spawnpoint bounds={bounds} />}
      {selected.weather && <Weather bounds={bounds} />}
      <Nav
        selected={selected}
        setSelected={setSelected}
        config={config}
        settings={settings}
        setSettings={setSettings}
      />
    </>
  )
}

export default MapTiles
