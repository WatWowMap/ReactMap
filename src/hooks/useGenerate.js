import { useEffect } from 'react'

import genPokemon from '@services/filtering/genPokemon'
import genGyms from '@services/filtering/genGyms'
import genPokestops from '@services/filtering/genPokestops'

import { useMemory } from '@store/useMemory'

export default function useGenerate() {
  const pokemon = useMemory((s) => s.masterfile.pokemon)
  const gyms = useMemory((s) => s.filters.gyms)
  const pokestops = useMemory((s) => s.filters.pokestops)
  const staticMenus = useMemory((s) => s.menus)

  useEffect(() => {
    const pokeFilters = genPokemon(pokemon, staticMenus.pokemon.categories)
    const gymFilters = genGyms(gyms, staticMenus.gyms.categories)
    const stopFilters = genPokestops(
      pokemon,
      pokestops,
      staticMenus.pokestops.categories,
    )

    useMemory.setState({
      menuFilters: { ...gymFilters, ...stopFilters, ...pokeFilters },
    })
  }, [pokemon, gyms, pokestops, staticMenus])
}
