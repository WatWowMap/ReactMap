/* eslint-disable camelcase */
import L from 'leaflet'
import { useMasterfile, useStore } from '../../hooks/useStore'
import Utility from '../../services/Utility'

export default function gymMarker(gym, ts, hasRaid) {
  const { map: { iconSizes } } = useMasterfile(state => state.config)
  const { gyms: { filter } } = useStore(state => state.filters)
  const { path } = useStore(state => state.settings).icons
  const availableForms = useMasterfile(state => state.availableForms)
  const {
    in_battle, team_id, availble_slots, raid_level,
  } = gym

  const inBattle = in_battle ? 'battle' : 'gym'
  const teamId = team_id || 0
  let filledSlots = 6 - availble_slots || 0
  if (!teamId) filledSlots = 0

  let filterId = `t${team_id}-0`
  const gymSize = filter[filterId] ? iconSizes.gyms[filter[filterId].size] : iconSizes.gyms.md
  const iconAnchorY = gymSize * 0.849
  let popupAnchorY = -8 - iconAnchorY

  let iconHtml = `
    <div class="marker-image-holder">
      <img 
        src="/images/${inBattle}/${team_id}_${filledSlots}.png"
        style="width:${gymSize}px; 
        height:${gymSize}px;"
      />
    </div>`

  let raidIcon
  let raidSize = 0
  if (hasRaid) {
    const {
      raid_battle_timestamp,
      raid_pokemon_id,
      raid_pokemon_evolution,
      raid_pokemon_costume,
      raid_pokemon_gender,
      raid_pokemon_form,
    } = gym
    filterId = `e${raid_level}`
    raidSize = filter[filterId] ? iconSizes.raids[filter[filterId].size] : iconSizes.raids.md
    raidIcon = `/images/egg/${raid_level}.png`
    if (raid_pokemon_id > 0) {
      filterId = `p${raid_pokemon_id}-${raid_pokemon_form}`
      raidSize = filter[filterId] ? iconSizes.raids[filter[filterId].size] : iconSizes.raids.md
      raidIcon = `${path}/${Utility.getPokemonIcon(availableForms, raid_pokemon_id, raid_pokemon_form, raid_pokemon_evolution, raid_pokemon_gender, raid_pokemon_costume)}.png`
    } else if (raid_battle_timestamp < ts) {
      raidIcon = `/images/unknown_egg/${raid_level}.png`
    }
    const offsetY = gymSize * 0.269 - raidSize - filledSlots
    iconHtml += `
      <div class="marker-image-holder top-overlay" 
        style="width:${raidSize}px;
          height:${raidSize}px;
          left:50%;
          transform:translateX(-50%);
          top:${offsetY}px;"
      >
        <img 
          src="${raidIcon}" 
          style="width:${raidSize}px; 
          height:${raidSize}px;"
        />
      </div>`
    popupAnchorY += offsetY
  }

  return L.divIcon({
    iconSize: [gymSize, gymSize],
    iconAnchor: [gymSize / 2, iconAnchorY],
    popupAnchor: [0, popupAnchorY],
    className: 'gym-marker',
    html: iconHtml,
  })
}
