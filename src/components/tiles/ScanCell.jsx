// @ts-check
/* eslint-disable react/destructuring-assignment */
import * as React from 'react'
import { Polygon, Popup } from 'react-leaflet'

import PopupContent from '../popups/ScanCell'
import marker from '../markers/scanCell'

/**
 *
 * @param {import('@rm/types').ScanCell} scanCell
 * @returns
 */
const ScanCellTile = (scanCell) => (
  <Polygon
    positions={scanCell.polygon}
    pathOptions={marker(Date.now() / 1000 - scanCell.updated)}
  >
    <Popup position={[scanCell.center_lat, scanCell.center_lon]}>
      <PopupContent {...scanCell} />
    </Popup>
  </Polygon>
)

const ScanCellMemo = React.memo(ScanCellTile)

export default ScanCellMemo
