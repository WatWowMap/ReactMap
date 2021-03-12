import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerIcon from './MarkerIcon.js'
import PopupContent from './Popup.jsx'
import MarkerClusterGroup from 'react-leaflet-markercluster'
import { useQuery } from '@apollo/client'
import Query from '../../services/Query.js'

const Pokestop = ({ bounds }) => {
  const { loading, error, data } = useQuery(Query.getAllPokestops(), {
    variables: {
      minLat: bounds._southWest.lat,
      minLon: bounds._southWest.lng,
      maxLat: bounds._northEast.lat,
      maxLon: bounds._northEast.lng
    }
  })
  
  return (
    <>
      {data && <MarkerClusterGroup
        disableClusteringAtZoom={16}
      >
        {data.pokestops.map(pokestop => {
          return (
            <Marker
              key={pokestop.id}
              position={[pokestop.lat, pokestop.lon]}
              icon={MarkerIcon(pokestop)}>
              <Popup position={[pokestop.lat, pokestop.lon]}>
                <PopupContent pokestop={pokestop} />
              </Popup>
            </Marker>
          )
        })}
      </MarkerClusterGroup>}
    </>
  )
}

export default Pokestop
