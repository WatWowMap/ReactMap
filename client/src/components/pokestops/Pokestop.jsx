import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-markercluster'

import { useQuery } from '@apollo/client'
import Query from '../../services/Query.js'

import stopMarker from './stopMarker.js'
import questMarker from './questMarker.js'
import PopupContent from './Popup.jsx'

const Pokestop = ({ bounds, globalFilters, settings, availableForms }) => {
  const trimmedFilters = {
    pokestops: {},
  }
  if (globalFilters.pokestops.enabled) {
    Object.entries(globalFilters.pokestops.filter).forEach(filter => {
      if (filter[1].enabled) {
        trimmedFilters.pokestops[filter[0]] = filter[1]
      }
    })
  }
  const { loading, error, data } = useQuery(Query.getAllPokestops(), {
    variables: { ...bounds, filters: trimmedFilters }
  })
  const ts = (new Date).getTime() / 1000

  return (
    <MarkerClusterGroup
      disableClusteringAtZoom={16}
    >
      {data && data.pokestops.map(pokestop => {
        return (
          <Marker
            key={pokestop.id}
            position={[pokestop.lat, pokestop.lon]}
            icon={stopMarker(pokestop, ts, globalFilters.pokestops)}>
            <Marker
              key={pokestop.id}
              position={[pokestop.lat, pokestop.lon]}
              icon={questMarker(pokestop, settings, availableForms)}>
              <Popup position={[pokestop.lat, pokestop.lon]}>
                <PopupContent pokestop={pokestop} />
              </Popup>
            </Marker>
            <Popup position={[pokestop.lat, pokestop.lon]}>
              <PopupContent pokestop={pokestop} />
            </Popup>
          </Marker>
        )
      })}
    </MarkerClusterGroup>
  )
}

export default Pokestop
