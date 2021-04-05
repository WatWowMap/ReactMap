import React from 'react'
import { Circle, Popup } from 'react-leaflet'
import PopupContent from './Popup'
import marker from './marker'

const PortalTile = ({ portal }) => (
  <Circle
    key={portal.id}
    center={[portal.lat, portal.lon]}
    radius={3}
    pathOptions={marker(portal)}
  >
    <Popup position={[portal.lat, portal.lon]}>
      <PopupContent portal={portal} />
    </Popup>
  </Circle>
)

const areEqual = (prevPortal, nextPortal) => (
  prevPortal.id === nextPortal.id
  && prevPortal.lat === nextPortal.lat
  && prevPortal.lon === nextPortal.lon
)

export default React.memo(PortalTile, areEqual)
