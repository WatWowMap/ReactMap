import React, {
  useEffect, useState, useRef, memo,
} from 'react'
import { Circle, Popup } from 'react-leaflet'

import PopupContent from '../popups/Portal'
import marker from '../markers/portal'

const PortalTile = ({
  item, userSettings, ts, params, Icons,
}) => {
  const [done, setDone] = useState(false)
  const markerRefs = useRef({})

  useEffect(() => {
    const { id } = params
    if (id === item.id) {
      const markerToOpen = markerRefs.current[id]
      markerToOpen.openPopup()
    }
  }, [done])

  return (
    <Circle
      key={item.id}
      ref={(m) => {
        markerRefs.current[item.id] = m
        if (!done && item.id === params.id) {
          setDone(true)
        }
      }}
      center={[item.lat, item.lon]}
      radius={20}
      pathOptions={marker(item, ts, userSettings)}
    >
      <Popup position={[item.lat, item.lon]}>
        <PopupContent portal={item} ts={ts} Icons={Icons} />
      </Popup>
    </Circle>
  )
}

const areEqual = (prev, next) => (
  prev.item.id === next.item.id
  && prev.userSettings.clustering === next.userSettings.clustering
  && prev.userSettings.oldPortals === next.userSettings.oldPortals
  && prev.userSettings.newPortals === next.userSettings.newPortals
)

export default memo(PortalTile, areEqual)
