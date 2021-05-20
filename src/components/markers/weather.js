import { Icon } from 'leaflet'

export default function weatherMarker(weather) {
  return new Icon({
    iconUrl: `/images/weather/${weather.gameplay_condition}.png`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -10],
  })
}
