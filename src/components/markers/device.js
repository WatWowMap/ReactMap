import { Icon } from 'leaflet'

export default function getDeviceMarkers(status, Icons) {
  const size = Icons.getSize('device')
  const { x, y } = Icons.getPopupOffset('device')
  return new Icon({
    iconUrl: Icons.getMisc(status),
    iconSize: [size, size],
    iconAnchor: [20, 33.96],
    popupAnchor: [-5 + x, -37 + y],
    className: 'marker',
  })
}
