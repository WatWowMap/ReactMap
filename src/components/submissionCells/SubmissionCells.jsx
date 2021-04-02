import React from 'react'
import {
  Popup, Polygon, Circle, Tooltip,
} from 'react-leaflet'

import { useQuery } from '@apollo/client'
import Query from '../../services/Query'
import Utility from '../../services/Utility'
import getPlacementCells from './data/getPlacementCells'
import getTypeCells from './data/getTypeCells'
import placementStyle from './placementStyle'
import typeStyle from './typeStyle'
import PopupContent from './Popup'

export default function SubmissionCell({ bounds }) {
  const { data, previousData } = useQuery(Query.getAllSubmissionCells(), {
    variables: bounds,
  })

  let cells = {
    placementCells: {
      cells: [],
      rings: [],
    },
    typeCells: [],
  }

  const renderedData = data || previousData
  if (renderedData) {
    cells = {
      placementCells: getPlacementCells(bounds, data.pokestops, data.gyms),
      typeCells: getTypeCells(bounds, data.pokestops, data.gyms),
    }
  }

  return (
    <>
      {cells.placementCells.rings.map(ring => (
        <Circle
          key={ring.id}
          center={[ring.lat, ring.lon]}
          radius={20}
          interactive={false}
        />
      ))}
      {cells.placementCells.cells.map(cell => (
        <Polygon
          key={cell.id}
          positions={Utility.getPolyVector(cell.id, 'polygon')}
          pathOptions={placementStyle(cell.blocked)}
          interactive={false}
        />
      ))}
      {cells.typeCells.map(cell => (
        <Polygon
          key={cell.id}
          positions={Utility.getPolyVector(cell.id, 'polygon')}
          pathOptions={typeStyle(cell)}
        >
          <Popup
            position={[cell.lat, cell.lon]}
          >
            <PopupContent cell={cell} />
          </Popup>
          <Tooltip
            position={[cell.lat, cell.lon]}
            direction="center"
            permanent
          >
            {cell.count}
          </Tooltip>
        </Polygon>
      ))}
    </>
  )
}
