import React, { memo } from 'react'
import { Polygon, Popup } from 'react-leaflet'

import PopupContent from '../popups/ScanCell'
import marker from '../markers/scanCell'

const ScanCellTile = ({ item, config, zoom, ts }) =>
  zoom >= config.scanCellsZoom && (
    <Polygon positions={item.polygon} pathOptions={marker(ts - item.updated)}>
      <Popup position={[item.center_lat, item.center_lon]}>
        <PopupContent cell={item} ts={ts} />
      </Popup>
    </Polygon>
  )

const areEqual = (prev, next) =>
  prev.item.id === next.item.id &&
  prev.item.updated === next.item.updated &&
  prev.zoom === next.zoom

export default memo(ScanCellTile, areEqual)
