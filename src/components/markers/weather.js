import { Icon } from 'leaflet'

export default function weatherMarker(weather) {
  return new Icon({
    iconUrl: `/images/weather/${weather.gameplay_condition}.png`,
    iconSize: [30, 30],
    iconAnchor: [20, 20],
    popupAnchor: [-2.5, -20],
    className: 'weather-icon',
  })
}
