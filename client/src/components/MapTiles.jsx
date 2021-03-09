import React, { useState, useEffect, useCallback } from 'react'
import { TileLayer } from 'react-leaflet'
import Gym from './gyms/Gym.jsx'
import Pokestop from './pokestops/Pokestop.jsx'
import Pokemon from './pokemon/Pokemon.jsx'

const MapTiles = ({ map, settings }) => {
  const [bounds, setBounds] = useState(null)
  const [position, setPosition] = useState({})

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
      <Gym bounds={bounds} />
      <Pokestop bounds={bounds} />
      <Pokemon bounds={bounds} />
    </>
  )
}

export default MapTiles