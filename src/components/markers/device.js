import { Icon } from 'leaflet'

export default function getDeviceMarkers(device, ts) {
  const deviceStatus = ts - device.last_seen < 900 ? '0' : '1'
  return new Icon({
    iconUrl: `/images/device/${deviceStatus}.png`,
    iconSize: [30, 30],
    iconAnchor: [20, 33.96],
    popupAnchor: [0, -41.96],
    className: 'marker',
  })
}
