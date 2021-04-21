import { Icon } from 'leaflet'
import Utility from '../../services/Utility'
import { useStore, useMasterfile } from '../../hooks/useStore'

export default function raidMarker(gym, ts) {
  const iconSize = 30
  const iconAnchorY = iconSize * 0.849
  const popupAnchorY = -8 - iconAnchorY
  const offsetY = iconSize + 25

  let iconUrl
  if (gym.raid_battle_timestamp <= ts && gym.raid_end_timestamp >= ts && gym.raid_level > 0) {
    if (gym.raid_pokemon_id !== 0 && gym.raid_pokemon_id !== null) {
      const url = useStore(state => state.settings).iconStyle.path
      const availableForms = useMasterfile(state => state.availableForms)
      iconUrl = `${url}/${Utility.getPokemonIcon(availableForms, gym.raid_pokemon_id, gym.raid_pokemon_form, gym.raid_pokemon_evolution, gym.raid_pokemon_gender, gym.raid_pokemon_costume)}.png`
    } else {
      iconUrl = `/images/unknown_egg/${gym.raid_level}.png`
    }
  } else if (gym.raid_end_timestamp >= ts && gym.raid_level > 0) {
    iconUrl = `/images/egg/${gym.raid_level}.png`
  }

  return new Icon({
    iconUrl,
    iconSize,
    iconAnchor: [iconSize / 2, offsetY],
    popupAnchor: [0, popupAnchorY - 21.5],
  })
}
