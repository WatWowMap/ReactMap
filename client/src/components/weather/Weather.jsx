import React from 'react'
import { Popup, Polygon, Polyline, Marker } from 'react-leaflet'

import { useQuery } from '@apollo/client'
import Query from '../../services/Query.js'

import marker from './marker.js'
import PopupContent from './Popup.jsx'
import getPolygon from '../../services/getPolygon.js'
import getPolyline from '../../services/getPolyline.js' 

const Weather = ({ bounds }) => {
  const { loading, error, data } = useQuery(Query.getAllWeather(), {
    variables: {
      minLat: bounds._southWest.lat,
      minLon: bounds._southWest.lng,
      maxLat: bounds._northEast.lat,
      maxLon: bounds._northEast.lng
    }
  })

  return (
    <>
      {data && data.weather.map(cell => {
        return (
          <Polyline
            key={cell.id}
            positions={getPolyline(cell.id)}
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
