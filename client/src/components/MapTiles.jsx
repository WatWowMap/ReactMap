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

const MapTiles = ({ map, settings }) => {
  const [bounds, setBounds] = useState({
    _southWest: { 
      lat: settings.map.startLat-0.025, 
      lng: settings.map.startLon-0.025 
    },
    _northEast: { 
      lat: settings.map.startLat+0.025, 
      lng: settings.map.startLon+0.025
    }
  })
  const [selected, setSelected] = useState({
    gyms: settings.map.filters.gyms,
    raids: settings.map.filters.raids,
    pokestops: settings.map.filters.pokestops,
    quests: settings.map.filters.quests,
    invasions: settings.map.filters.invasions,
    spawnpoints: settings.map.filters.spawnpoints,
    pokemon: settings.map.filters.pokemon,
    portals: settings.map.filters.portals,
    scanCells: settings.map.filters.scanCells,
    s2Cells: settings.map.filters.submissionCells,
    weather: settings.map.filters.weather,
    scanAreas: settings.map.filters.scanAreas,
    devices: settings.map.filters.devices
  })

  const onMove = useCallback(() => {
    setBounds(map.getBounds())
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
        attribution={`&copy; <a href='https://stadiamaps.com/'>Stadia Maps</a>, &copy; <a href='https://openmaptiles.org/'>OpenMapTiles</a> &copy; <a href='http://openstreetmap.org'>OpenStreetMap</a> contributors`}
        url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
      />
      <ZoomControl position='topright' zoomInText='+' zoomOutText='-' />
      {selected.devices && <Device />}
      {selected.gyms && <Gym bounds={bounds} />}
      {selected.pokestops && <Pokestop bounds={bounds} />}
      {selected.pokemon && <Pokemon bounds={bounds} />}
      {selected.portals && <Portal bounds={bounds} />}
      {selected.spawnpoints && <Spawnpoint bounds={bounds} />}
      {selected.weather && <Weather />}
      <Nav
        selected={selected}
        setSelected={setSelected}
      />
    </>
  )
}

export default MapTiles
