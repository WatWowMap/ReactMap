import { Icon } from 'leaflet'
import Utility from '../../services/Utility.js' 

export default function (pokestop, settings, availableForms) {

  const rewards = JSON.parse(pokestop.quest_rewards)
  let iconUrl = 'pokestop/0'
  const id = rewards[0].type;
  const info = rewards[0].info;

  if (id === 1 && info !== undefined && info.amount !== undefined) {
    // XP
    iconUrl = `/img/item/-2.png`
  } else if (id === 2) {
    // Item
    const item = info && info.item_id
    iconUrl = `/img/item/${item}.png`
  } else if (id === 3) {
    // Stardust
    iconUrl = '/img/item/-1.png'
  } else if (id === 4) {
    // Candy
    iconUrl = '/img/item/-3.png'
  } else if (id === 5) {
    // Avatar clothing
    iconUrl = `/img/item/-4.png`
  } else if (id === 6) {
    // Quest
    iconUrl = `/img/item/-5.png`
  } else if (id === 7 && info !== undefined) {
    // Pokemon
    iconUrl = `${settings.iconStyle.path}/${Utility.getPokemonIcon(availableForms, info.pokemon_id, info.form_id, 0, info.gender_id, info.costume_id, info.shiny)}.png`
  } else if (id === 8) {
    // Pokecoin
    iconUrl = `/img/item/-6.png`
  } else if (id === 11) {
    // Sticker
    iconUrl = `/img/item/-7.png`
  } else if (id === 12) {
    // Mega resource
    iconUrl = '/img/item/-8.png'
  } else {
    iconUrl = `/img/item/-0.png`
  }

  return new Icon({
    iconUrl,
    iconSize: [20, 20],
    iconAnchor: [15, 55],
    popupAnchor: [0, -41.96],
  })
}