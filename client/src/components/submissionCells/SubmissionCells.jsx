import React from 'react'
import { Popup, Polygon, Circle, Tooltip } from 'react-leaflet'

import { useQuery } from '@apollo/client'
import Query from '../../services/Query.js'

import Utility from '../../services/Utility'
import getPlacementCells from './data/getPlacementCells.js'
import getTypeCells from './data/getTypeCells.js'

import placementStyle from './placementStyle.js'
import PopupContent from './Popup.jsx'
import typeStyle from './typeStyle.js'

const SubmissionCell = ({ bounds }) => {
  const { loading, error, data } = useQuery(Query.getAllSubmissionCells(), {
    variables: bounds
  })

  let cells = {
    placementCells: {
      cells: [],
      rings: []
    },
    typeCells: []
  }

  if (data) {
    cells = {
      placementCells: getPlacementCells(bounds, data.pokestops, data.gyms),
      typeCells: getTypeCells(bounds, data.pokestops, data.gyms)
    }
  }

  return (
    <>
      {cells.placementCells.rings.map(ring => {
        return (
          <Circle
            key={ring.id}
            center={[ring.lat, ring.lon]}
            radius={20}
            interactive={false}>
          </Circle>
        )
      })}
      {cells.placementCells.cells.map(cell => {
        return (
          <Polygon
            key={cell.id}
            positions={Utility.getPolyVector(cell.id, 'polygon')}
            pathOptions={placementStyle(cell.blocked)}
            interactive={false}>
          </Polygon>
        )
      })}
      {cells.typeCells.map(cell => {
        return (
          <Polygon
            key={cell.id}
            positions={Utility.getPolyVector(cell.id, 'polygon')}
            pathOptions={typeStyle(cell)}>
            <Popup
              position={[cell.lat, cell.lon]}>
              <PopupContent cell={cell} />
            </Popup>
            <Tooltip
              position={[cell.lat, cell.lon]}
              direction='center'
              permanent>
              {cell.count}
            </Tooltip>
          </Polygon>
        )
      })}
    </>
  )
}

export default SubmissionCell
