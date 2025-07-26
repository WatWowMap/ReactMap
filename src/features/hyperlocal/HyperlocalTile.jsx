// @ts-check
import * as React from 'react'
import { Circle, Popup } from 'react-leaflet'

import { HyperlocalPopup } from './HyperlocalPopup'
import { hyperlocalMarker } from './hyperlocalMarker'

/**
 * @param {import('@rm/types').Hyperlocal & { lat: number, lon: number }} props
 */
const BaseHyperlocalTile = (props) => {
  const markerProps = hyperlocalMarker(props)

  return (
    <Circle
      center={markerProps.center}
      radius={markerProps.radius}
      pathOptions={markerProps.pathOptions}
      className={markerProps.className}
    >
      <Popup>
        <HyperlocalPopup hyperlocal={props} />
      </Popup>
    </Circle>
  )
}

export const HyperlocalTile = React.memo(
  BaseHyperlocalTile,
  (prev, next) => prev.updated_ms === next.updated_ms,
)
