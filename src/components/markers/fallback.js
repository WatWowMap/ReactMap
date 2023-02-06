import markerIconPng from 'leaflet/dist/images/marker-icon.png'
import { Icon } from 'leaflet'

export default function fallbackIcon() {
  return new Icon({
    iconUrl: markerIconPng,
    iconSize: [25, 41],
    iconAnchor: [12, 35],
    popupAnchor: [1, -30],
  })
}
