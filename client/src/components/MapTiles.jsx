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

const MapTiles = ({ map, settings }) => {
  const [bounds, setBounds] = useState({
    minLat: settings.map.startLat - 0.025,
    maxLat: settings.map.startLat + 0.025,
    minLon: settings.map.startLon - 0.025,
    maxLon: settings.map.startLon + 0.025
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
    submissionCells: settings.map.filters.submissionCells,
    weather: settings.map.filters.weather,
    scanAreas: settings.map.filters.scanAreas,
    devices: settings.map.filters.devices
  })

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
        attribution={`&copy; <a href='https://stadiamaps.com/'>Stadia Maps</a>, &copy; <a href='https://openmaptiles.org/'>OpenMapTiles</a> &copy; <a href='http://openstreetmap.org'>OpenStreetMap</a> contributors`}
        url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
      />
      <ZoomControl position='topright' zoomInText='+' zoomOutText='-' />
      {selected.devices && <Device />}
      {selected.gyms && <Gym bounds={bounds} />}
      {selected.pokestops && <Pokestop bounds={bounds} />}
      {selected.pokemon && <Pokemon bounds={bounds} />}
      {selected.portals && <Portal bounds={bounds} />}
      {selected.scanCells && <S2Cell bounds={bounds} />}
      {selected.submissionCells && <SubmissionCell bounds={bounds} />}
      {selected.spawnpoints && <Spawnpoint bounds={bounds} />}
      {selected.weather && <Weather bounds={bounds} />}
      <Nav
        selected={selected}
        setSelected={setSelected}
      />
    </>
  )
}

export default MapTiles
