import React from 'react'
import { Popup, Polygon } from 'react-leaflet'

import { useQuery } from '@apollo/client'
import Query from '../../services/Query.js'

import marker from './marker.js'
import PopupContent from './Popup.jsx'
import getPolyVector from '../../services/getPolyVector'

const S2Cell = ({ bounds }) => {
  const { loading, error, data } = useQuery(Query.getAllS2Cells(), {
    variables: {
      minLat: bounds._southWest.lat,
      minLon: bounds._southWest.lng,
      maxLat: bounds._northEast.lat,
      maxLon: bounds._northEast.lng
    }
  })

  return (
    <>
      {data && data.s2Cells.map(cell => {
        return (
          <Polygon
            key={cell.id}
            positions={getPolyVector(cell.id, 'polygon')}
            pathOptions={marker(cell.updated)}>
            <Popup position={[cell.latitude, cell.longitude]}>
              <PopupContent cell={cell} />
            </Popup>
          </Polygon>
        )
      })}
    </>
  )
}

export default S2Cell
