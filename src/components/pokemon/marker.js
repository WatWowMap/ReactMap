import { Icon } from 'leaflet'
import Utility from '../../services/Utility'
import { useStore } from '../../hooks/useStore'

export default function pokemonMarker(pokemon, realForm) {
  return new Icon({
    iconUrl: `${useStore(state => state.settings).iconStyle.path}/${Utility.getPokemonIcon(pokemon.pokemon_id, realForm, 0, 0, pokemon.costume)}.png`,
    iconSize: [30, 30],
    iconAnchor: [20, 33.96],
    popupAnchor: [0, -41.96],
  })
}
