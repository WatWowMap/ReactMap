import React from 'react'
import { Popup, Polyline, Marker } from 'react-leaflet'

import { useQuery } from '@apollo/client'
import Query from '../../services/Query.js'

import marker from './marker.js'
import PopupContent from './Popup.jsx'
import Utility from '../../services/Utility.js' 

const Weather = ({ bounds }) => {
  const { loading, error, data } = useQuery(Query.getAllWeather(), {
    variables: bounds
  })

  return (
    <>
      {data && data.weather.map(cell => {
        return (
          <Polyline
            key={cell.id}
            positions={Utility.getPolyVector(cell.id, 'polyline')}
            pathOptions={{ color: 'green', opacity: 0.5 }}>
            <Marker icon={marker(cell)} position={[cell.latitude, cell.longitude]}>
              <Popup position={[cell.latitude, cell.longitude]}>
                <PopupContent weather={cell} />
              </Popup>
            </Marker>
          </Polyline>
        )
      })}
    </>
  )
}

export default Weather
