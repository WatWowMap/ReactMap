import { Icon } from 'leaflet'

export default function gymMarker(gym, ts) {
  const iconSize = 30
  const iconAnchorY = iconSize * 0.849
  const popupAnchorY = (gym.raid_end_timestamp >= ts && gym.raid_level > 0)
    ? -55 : -2 - iconAnchorY

  const inBattle = gym.in_battle ? 'battle' : 'gym'

  const teamId = gym.team_id || 0
  let filledSlots = 6 - gym.availble_slots || 0
  if (!teamId) filledSlots = 0

  return new Icon({
    iconUrl: `/images/${inBattle}/${teamId}_${filledSlots}.png`,
    iconSize,
    iconAnchor: [iconSize / 2, iconAnchorY],
    popupAnchor: [0, popupAnchorY],
    className: 'marker',
  })
}
