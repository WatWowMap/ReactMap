import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'

import Query from '../../services/Query'
import marker from './marker'
import PopupContent from './Popup'

export default function Pokemon({
  bounds, availableForms, settings, filters,
}) {
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
        <Marker
          key={pokes.id}
          position={[pokes.lat, pokes.lon]}
          icon={marker(settings, availableForms, pokes, pokes.form)}
        >
          <Popup position={[pokes.lat, pokes.lon]}>
            <PopupContent pokemon={pokes} />
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  )
}
