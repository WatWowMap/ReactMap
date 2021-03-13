import React from 'react'
import { Popup, Polygon } from 'react-leaflet'

import { useQuery } from '@apollo/client'
import Query from '../../services/Query.js'

import marker from './marker.js'
import PopupContent from './Popup.jsx'
import getPolygon from '../../services/getPolygon.js' 

const Weather = props => {
  const { loading, error, data } = useQuery(Query.getAllWeather())

  return (
    <>
      {data && data.weather.map(cell => {
        return (
          <Polygon
            key={cell.id}
            positions={getPolygon(cell.id)}
            pathOptions={marker(cell.id)}>
            <Popup position={[cell.lat, cell.lon]}>
              <PopupContent weather={cell} />
            </Popup>
          </Polygon>
        )
      })}
    </>
  )
}

export default Weather
