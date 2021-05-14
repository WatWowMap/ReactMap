/* eslint-disable camelcase */
import { Icon } from 'leaflet'
import Utility from '../../services/Utility'
import { useStore, useMasterfile } from '../../hooks/useStore'

export default function questMarker(pokestop) {
  const {
    quest_reward_type: rewardType,
    quest_item_id: itemId,
    quest_pokemon_id: pokemonId,
    quest_form_id: formId,
    quest_gender_id: genderId,
    quest_costume_id: costumeId,
    quest_shiny: shiny,
    mega_pokemon_id: megaId,
  } = pokestop
  const { path } = useStore(state => state.settings).icons
  const availableForms = useMasterfile(state => state.availableForms)
  let iconUrl = '/images/pokestop/0.png'

  switch (rewardType) {
    default: iconUrl = '/images/item/-0.png'; break
    case 1: iconUrl = '/images/item/-2.png'; break
    case 2: iconUrl = `/images/item/${itemId}.png`; break
    case 3: iconUrl = '/images/item/-1.png'; break
    case 4: iconUrl = '/images/item/-3.png'; break
    case 5: iconUrl = '/images/item/-4.png'; break
    case 6: iconUrl = '/images/item/-5.png'; break
    case 7:
      iconUrl = `${path}/${Utility.getPokemonIcon(availableForms, pokemonId, formId, 0, genderId, costumeId, shiny)}.png`; break
    case 8: iconUrl = '/images/item/-6.png'; break
    case 11: iconUrl = '/images/item/-7.png'; break
    case 12:
      iconUrl = `${path}/${Utility.getPokemonIcon(availableForms, megaId, 0, 1)}.png`; break
  }

  return new Icon({
    iconUrl,
    iconSize: [20, 20],
    iconAnchor: [15, 55],
    popupAnchor: [0, -41.96],
    className: 'marker',
  })
}
