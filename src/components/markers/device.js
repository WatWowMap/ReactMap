import { Icon } from 'leaflet'

export default function getDeviceMarkers(status, Icons) {
  const size = Icons.getSize('device')
  return new Icon({
    iconUrl: Icons.getMisc(status),
    iconSize: [size, size],
    iconAnchor: [20, 33.96],
    popupAnchor: [0, -41.96],
    className: 'marker',
  })
}
