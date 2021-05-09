import { Icon } from 'leaflet'

export default function pokemonMarker(iconUrl) {
  return new Icon({
    iconUrl,
    iconSize: [30, 30],
    iconAnchor: [20, 33.96],
    popupAnchor: [0, -41.96],
  })
}
