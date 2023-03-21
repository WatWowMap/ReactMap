import * as React from 'react'
import { Polyline } from 'react-leaflet'

function BaseCell({ item, tileStyle, userSettings }) {
  return (
    <Polyline
      key={item.id}
      positions={[...item.coords, item.coords[0]]}
      color={
        tileStyle === 'dark'
          ? userSettings.darkMapBorder || 'red'
          : userSettings.lightMapBorder || 'black'
      }
      weight={0.5}
    />
  )
}

const MemoBaseCell = React.memo(BaseCell, (prev, next) => prev.id === next.id)

export default MemoBaseCell
