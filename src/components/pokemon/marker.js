import { Icon } from 'leaflet'
import Utility from '../../services/Utility'
import { useStore, useMasterfile } from '../../hooks/useStore'

export default function pokemonMarker(pokemon) {
  const url = useStore(state => state.settings).iconStyle.path
  const availableForms = useMasterfile(state => state.availableForms)

  return new Icon({
    iconUrl: `${url}/${Utility.getPokemonIcon(availableForms, pokemon.pokemon_id, pokemon.form, 0, 0, pokemon.costume)}.png`,
    iconSize: [30, 30],
    iconAnchor: [20, 33.96],
    popupAnchor: [0, -41.96],
  })
}
