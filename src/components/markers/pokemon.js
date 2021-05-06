import { Icon } from 'leaflet'
import Utility from '../../services/Utility'
import { useStore, useMasterfile } from '../../hooks/useStore'

export default function pokemonMarker(pokemon) {
  const { path } = useStore(state => state.settings).icons
  const availableForms = useMasterfile(state => state.availableForms)

  return new Icon({
    iconUrl: `${path}/${Utility.getPokemonIcon(availableForms, pokemon.pokemon_id, pokemon.form, 0, 0, pokemon.costume)}.png`,
    iconSize: [30, 30],
    iconAnchor: [20, 33.96],
    popupAnchor: [0, -41.96],
  })
}
