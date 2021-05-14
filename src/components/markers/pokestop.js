import { Icon } from 'leaflet'

export default function stopMarker(pokestop, ts) {
  let iconType = 'pokestop/0'
  const lureId = pokestop.lure_id ? pokestop.lure_id.toString().slice(-1) : 0

  if (pokestop.lure_expire_timestamp >= ts && pokestop.incident_expire_timestamp >= ts) {
    iconType = `invasion/i${lureId}_${pokestop.grunt_type}`
  } else if (pokestop.lure_expire_timestamp >= ts) {
    iconType = `pokestop/${lureId}`
  } else if (pokestop.incident_expire_timestamp >= ts) {
    iconType = `invasion/i_${pokestop.grunt_type}`
  }

  return new Icon({
    iconUrl: `/images/${iconType}.png`,
    iconSize: [30, 30],
    iconAnchor: [20, 33.96],
    popupAnchor: [0, -41.96],
    className: 'marker',
  })
}
