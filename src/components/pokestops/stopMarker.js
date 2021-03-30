import { Icon } from 'leaflet'

export default function stopMarker(pokestop, ts) {
  let iconType = 'pokestop/0'
  let lureId = 0
  if (pokestop.lure_id !== 0) {
    if (pokestop.lure_id === 501) lureId = 1
    if (pokestop.lure_id === 502) lureId = 2
    if (pokestop.lure_id === 503) lureId = 3
    if (pokestop.lure_id === 504) lureId = 4
  }

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
  })
}
