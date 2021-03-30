import React from 'react'
import { Popup, Polyline, Marker } from 'react-leaflet'
import { useQuery } from '@apollo/client'

import Query from '../../services/Query'
import marker from './marker'
import PopupContent from './Popup'
import Utility from '../../services/Utility'

export default function Weather({ bounds }) {
  const { data } = useQuery(Query.getAllWeather(), {
    variables: bounds,
  })

  return (
    <>
      {data && data.weather.map(cell => (
        <Polyline
          key={cell.id}
          positions={Utility.getPolyVector(cell.id, 'polyline')}
          pathOptions={{ color: 'green', opacity: 0.5 }}
        >
          <Marker icon={marker(cell)} position={[cell.latitude, cell.longitude]}>
            <Popup position={[cell.latitude, cell.longitude]}>
              <PopupContent weather={cell} />
            </Popup>
          </Marker>
        </Polyline>
      ))}
    </>
  )
}
