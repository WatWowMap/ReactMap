import { Icon } from 'leaflet'
import Utility from '../../services/Utility'
import { useStore, useMasterfile } from '../../hooks/useStore'

export default function questMarker(pokestop) {
  let iconUrl = '/images/pokestop/0.png'
  const { path } = useStore(state => state.settings).icons
  const availableForms = useMasterfile(state => state.availableForms)

  switch (pokestop.quest_reward_type) {
    default: iconUrl = '/images/item/-0.png'; break
    case 1: iconUrl = '/images/item/-2.png'; break
    case 2: iconUrl = `/images/item/${pokestop.quest_item_id}.png`; break
    case 3: iconUrl = '/images/item/-1.png'; break
    case 4: iconUrl = '/images/item/-3.png'; break
    case 5: iconUrl = '/images/item/-4.png'; break
    case 6: iconUrl = '/images/item/-5.png'; break
    case 7:
      iconUrl = `${path}/${Utility.getPokemonIcon(availableForms, pokestop.quest_pokemon_id, pokestop.quest_form_id, 0, pokestop.quest_gender_id, pokestop.quest_costume_id, pokestop.quest_shiny)}.png`; break
    case 8: iconUrl = '/images/item/-6.png'; break
    case 11: iconUrl = '/images/item/-7.png'; break
    case 12:
      iconUrl = `${path}/${Utility.getPokemonIcon(availableForms, pokestop.mega_pokemon_id, 0, 1)}.png`; break
  }

  return new Icon({
    iconUrl,
    iconSize: [20, 20],
    iconAnchor: [15, 55],
    popupAnchor: [0, -41.96],
  })
}
