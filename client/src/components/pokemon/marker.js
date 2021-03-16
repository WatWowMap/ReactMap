import { Icon } from 'leaflet'
import getPokemonIcon from '../../services/getPokemonIcon.js' 

export default function (settings, availableForms, pokemon) {

  return new Icon({
    iconUrl: `${settings.iconStyle.path}/${getPokemonIcon(availableForms, pokemon.pokemon_id, 0, 0, 0, pokemon.costume)}.png`,
    iconSize: [30, 30],
    iconAnchor: [20, 33.96],
    popupAnchor: [0, -41.96],
  })
}