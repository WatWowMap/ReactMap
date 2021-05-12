import { Icon } from 'leaflet'
import Utility from '../../services/Utility'
import { useStore, useMasterfile } from '../../hooks/useStore'

export default function raidMarker(gym, ts) {
  const {
    raid_battle_timestamp: startTS,
    raid_pokemon_id: pokemonId,
  } = gym
  const iconSize = 30
  const iconAnchorY = iconSize * 0.849
  const popupAnchorY = -8 - iconAnchorY
  const offsetY = iconSize + 25

  let iconUrl = `/images/egg/${gym.raid_level}.png`

  if (pokemonId > 0) {
    const { path } = useStore(state => state.settings).icons
    const availableForms = useMasterfile(state => state.availableForms)

    iconUrl = `${path}/${Utility.getPokemonIcon(availableForms, gym.raid_pokemon_id, gym.raid_pokemon_form, gym.raid_pokemon_evolution, gym.raid_pokemon_gender, gym.raid_pokemon_costume)}.png`
  } else if (startTS < ts) {
    iconUrl = `/images/unknown_egg/${gym.raid_level}.png`
  }

  return new Icon({
    iconUrl,
    iconSize,
    iconAnchor: [iconSize / 2, offsetY],
    popupAnchor: [0, popupAnchorY - 21.5],
  })
}
