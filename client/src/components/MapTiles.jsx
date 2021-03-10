import React, { useState, useEffect, useCallback } from 'react'
import { TileLayer } from 'react-leaflet'
import Gym from './gyms/Gym.jsx'
import Pokestop from './pokestops/Pokestop.jsx'
import Pokemon from './pokemon/Pokemon.jsx'
import { useQuery } from '@apollo/client'
import { getDataQuery } from '../services/queries.js'

const MapTiles = ({ map, settings }) => {
  const [bounds, setBounds] = useState({
    _southWest: {
      lat: 0,
      lng: 0
    },
    _northEast: {
      lat: 0,
      lng: 0
    }
  })
  const [position, setPosition] = useState({})
  const { loading, error, data } = useQuery(getDataQuery, {
    variables: {
      minLat: bounds._southWest.lat,
      minLon: bounds._southWest.lng,
      maxLat: bounds._northEast.lat,
      maxLon: bounds._northEast.lng
    }
  });

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
      {data &&
        <>
          <Gym data={data.gyms} />
          <Pokestop data={data.pokestops} />
          <Pokemon data={data.pokemon} />
        </>
      }
    </>
  )
}

export default MapTiles