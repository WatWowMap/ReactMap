import { Icon } from 'leaflet' 

export default function (settings, availableForms, gym, ts, globalFilters) {
  
  const iconSize = 30
  const iconAnchorY = iconSize * .849
  const popupAnchorY = (gym.raid_end_timestamp >= ts && gym.raid_level > 0) ?
  -55 : - 2 - iconAnchorY
  
  const inBattle = gym.in_battle ? 'battle' : 'gym'
  return new Icon({
    iconUrl: `/img/${inBattle}/${gym.team_id}_${6-gym.availble_slots}.png`,
    iconSize: iconSize,
    iconAnchor: [iconSize / 2, iconAnchorY],
    popupAnchor: [0, popupAnchorY],
  })
}
