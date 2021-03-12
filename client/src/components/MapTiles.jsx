import React, { useState, useEffect, useCallback } from 'react'
import { TileLayer, ZoomControl } from 'react-leaflet'
import Device from './devices/Device.jsx'
import Gym from './gyms/Gym.jsx'
import Pokestop from './pokestops/Pokestop.jsx'
import Pokemon from './pokemon/Pokemon.jsx'
import Nav from './layout/Nav.jsx'

const MapTiles = ({ map, settings }) => {
  const [bounds, setBounds] = useState({
    _southWest: { lat: 0, lng: 0 },
    _northEast: { lat: 0, lng: 0 }
  })
  const [position, setPosition] = useState({})
  const [selected, setSelected] = useState({
    Gyms: settings.map.filters.gyms,
    Raids: settings.map.filters.raids,
    Pokestops: settings.map.filters.pokestops,
    Quests: settings.map.filters.quests,
    Invasions: settings.map.filters.invasions,
    Spawnpoints: settings.map.filters.spawnpoints,
    Pokemon: settings.map.filters.pokemon,
    IngressPortals: settings.map.filters.portals,
    ScanCells: settings.map.filters.scanCells,
    S2Cells: settings.map.filters.submissionCells,
    Weather: settings.map.filters.weather,
    ScanAreas: settings.map.filters.scanAreas,
    Devices: settings.map.filters.devices
  })

  const onMove = useCallback(() => {
    setPosition(map.getCenter())
  }, [map])

  useEffect(() => {
    map.on('moveend', onMove)
    return () => {
      map.off('moveend', onMove)
    }
  }, [map, onMove])

  useEffect(() => {
    setBounds(map.getBounds())
  }, [position])

  return (
    <>
      <TileLayer
        attribution={`&copy; <a href='https://stadiamaps.com/'>Stadia Maps</a>, &copy; <a href='https://openmaptiles.org/'>OpenMapTiles</a> &copy; <a href='http://openstreetmap.org'>OpenStreetMap</a> contributors`}
        url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
      />
      <ZoomControl position='topright' zoomInText='+' zoomOutText='-' />
      {selected.Gyms && <Gym bounds={bounds} />}
      {selected.Pokestops && <Pokestop bounds={bounds} />}
      {selected.Pokemon && <Pokemon bounds={bounds} />}
      {selected.Devices && <Device />}
      <Nav
        selected={selected}
        setSelected={setSelected}
      />
    </>
  )
}

export default MapTiles