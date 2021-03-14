import { Icon } from 'leaflet'

export default function (weather) {
  const lastUpdate = new Date(weather.updated * 1000)
  const now = new Date

  const correctWeather = (
    lastUpdate.getFullYear() === now.getFullYear() &&
    lastUpdate.getMonth() === now.getMonth() &&
    lastUpdate.getDate() === now.getDate() &&
    lastUpdate.getHours() === now.getHours()
  )

  return new Icon({
    iconUrl: `/img/weather/${weather.gameplay_condition}.png`,
    iconSize: [30, 30],
    iconAnchor: [20, 33.96],
    popupAnchor: [0, -41.96]
  })
}