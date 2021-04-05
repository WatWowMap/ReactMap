/* eslint-disable no-underscore-dangle */
import React, { useState, useEffect, useCallback } from 'react'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'
import { useMap } from 'react-leaflet'

import Query from '../../services/Query'
import Pokemon from './PokemonTile'

export default function PokemonQuery({
  availableForms, settings, filters, config,
}) {
  const map = useMap()
  const [bounds, setBounds] = useState({
    minLat: config.map.startLat - 0.025,
    maxLat: config.map.startLat + 0.025,
    minLon: config.map.startLon - 0.025,
    maxLon: config.map.startLon + 0.025,
  })

  const onMove = useCallback(() => {
    const mapBounds = map.getBounds()
    setBounds({
      minLat: mapBounds._southWest.lat,
      maxLat: mapBounds._northEast.lat,
      minLon: mapBounds._southWest.lng,
      maxLon: mapBounds._northEast.lng,
    })
  }, [map])

  useEffect(() => {
    map.on('moveend', onMove)
    return () => {
      map.off('moveend', onMove)
    }
  }, [map])

  console.log('render')

  const trimmedFilters = {}
  Object.entries(filters).forEach(filter => {
    const [id, specifics] = filter
    if (specifics.enabled) {
      trimmedFilters[id] = specifics
    }
  })
  const { data, previousData } = useQuery(Query.getAllPokemon(), {
    variables: {
      ...bounds, filters: trimmedFilters,
    },
  })

  const renderedData = data || previousData
  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={16}
    >
      {renderedData && renderedData.pokemon.map(pokes => (
        <Pokemon
          key={pokes.id}
          pokemon={pokes}
          availableForms={availableForms}
          settings={settings}
        />
      ))}
    </MarkerClusterGroup>
  )
}
