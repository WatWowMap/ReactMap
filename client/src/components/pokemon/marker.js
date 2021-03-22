import { Icon } from 'leaflet'
import Utility from '../../services/Utility.js' 

export default function (settings, availableForms, pokemon, realForm) {

  return new Icon({
    iconUrl: `${settings.iconStyle.path}/${Utility.getPokemonIcon(availableForms, pokemon.pokemon_id, realForm, 0, 0, pokemon.costume)}.png`,
    iconSize: [30, 30],
    iconAnchor: [20, 33.96],
    popupAnchor: [0, -41.96],
  })
}