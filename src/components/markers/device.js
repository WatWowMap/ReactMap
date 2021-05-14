import { Icon } from 'leaflet'

export default function getDeviceMarkers(status) {
  return new Icon({
    iconUrl: `/images/device/${status}.png`,
    iconSize: [30, 30],
    iconAnchor: [20, 33.96],
    popupAnchor: [0, -41.96],
    className: 'marker',
  })
}
