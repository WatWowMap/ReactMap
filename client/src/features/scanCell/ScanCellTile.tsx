import * as React from 'react'
import { Polygon, Popup } from 'react-leaflet'

import { ScanCellPopup } from './ScanCellPopup'
import { scanCellMarker } from './scanCellMarker'

const BaseScanCellTile = (scanCell: import('@rm/types').ScanCell) => (
  <Polygon
    positions={scanCell.polygon}
    {...scanCellMarker(Date.now() / 1000 - scanCell.updated)}
  >
    <Popup position={[scanCell.center_lat, scanCell.center_lon]}>
      <ScanCellPopup {...scanCell} />
    </Popup>
  </Polygon>
)

export const ScanCellTile = React.memo(
  BaseScanCellTile,
  (prev, next) => prev.updated === next.updated,
)
