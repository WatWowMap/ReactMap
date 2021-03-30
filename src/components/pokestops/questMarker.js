import { Icon } from 'leaflet'
import Utility from '../../services/Utility'

export default function questMarker(pokestop, settings, availableForms) {
  const rewards = JSON.parse(pokestop.quest_rewards)
  let iconUrl = '/images/pokestop/0.png'
  const { type, info } = rewards ? rewards[0] : ''

  if (type === 1 && info !== undefined && info.amount !== undefined) {
    // XP
    iconUrl = '/images/item/-2.png'
  } else if (type === 2) {
    // Item
    const item = info && info.item_id
    iconUrl = `/images/item/${item}.png`
  } else if (type === 3) {
    // Stardust
    iconUrl = '/images/item/-1.png'
  } else if (type === 4) {
    // Candy
    iconUrl = '/images/item/-3.png'
  } else if (type === 5) {
    // Avatar clothing
    iconUrl = '/images/item/-4.png'
  } else if (type === 6) {
    // Quest
    iconUrl = '/images/item/-5.png'
  } else if (type === 7 && info !== undefined) {
    // Pokemon
    iconUrl = `${settings.iconStyle.path}/${Utility.getPokemonIcon(availableForms, info.pokemon_id, info.form_id, 0, info.gender_id, info.costume_id, info.shiny)}.png`
  } else if (type === 8) {
    // Pokecoin
    iconUrl = '/images/item/-6.png'
  } else if (type === 11) {
    // Sticker
    iconUrl = '/images/item/-7.png'
  } else if (type === 12) {
    // Mega resource
    iconUrl = '/images/item/-8.png'
  } else {
    iconUrl = '/images/item/-0.png'
  }

  return new Icon({
    iconUrl,
    iconSize: [20, 20],
    iconAnchor: [15, 55],
    popupAnchor: [0, -41.96],
  })
}
