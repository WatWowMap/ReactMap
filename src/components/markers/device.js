import { Icon } from 'leaflet'

export default function getDeviceMarkers(status, iconSizes) {
  return new Icon({
    iconUrl: `/images/device/${status}.png`,
    iconSize: [iconSizes.md, iconSizes.md],
    iconAnchor: [20, 33.96],
    popupAnchor: [0, -41.96],
    className: 'marker',
  })
}
