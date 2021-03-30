import React from 'react'
import { Popup, Polygon } from 'react-leaflet'
import { useQuery } from '@apollo/client'

import Query from '../../services/Query'
import marker from './marker'
import PopupContent from './Popup'
import Utility from '../../services/Utility'

export default function S2Cell({ bounds }) {
  const { data } = useQuery(Query.getAllS2Cells(), {
    variables: bounds,
  })

  return (
    <>
      {data && data.s2Cells.map(cell => (
        <Polygon
          key={cell.id}
          positions={Utility.getPolyVector(cell.id, 'polygon')}
          pathOptions={marker(cell.updated)}
        >
          <Popup position={[cell.latitude, cell.longitude]}>
            <PopupContent cell={cell} />
          </Popup>
        </Polygon>
      ))}
    </>
  )
}
