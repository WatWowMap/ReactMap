import { Icon } from 'leaflet' 

export default function (gym) {
  
  const inBattle = gym.in_battle ? 'battle' : 'gym'
  return new Icon({
    iconUrl: `/img/${inBattle}/${gym.team_id}_${6-gym.availble_slots}.png`,
    iconSize: [30, 30],
    iconAnchor: [20, 33.96],
    popupAnchor: [0, -41.96],
  })
}