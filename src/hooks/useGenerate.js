import { useEffect } from 'react'

import genPokemon from '@services/filtering/genPokemon'
import genGyms from '@services/filtering/genGyms'
import genPokestops from '@services/filtering/genPokestops'

import { useStatic } from '@hooks/useStore'

export default function useGenerate() {
  const pokemon = useStatic((s) => s.masterfile.pokemon)
  const gyms = useStatic((s) => s.filters.gyms)
  const pokestops = useStatic((s) => s.filters.pokestops)
  const staticMenus = useStatic((s) => s.menus)
  const setMenuFilters = useStatic((s) => s.setMenuFilters)

  useEffect(() => {
    const pokeFilters = genPokemon(pokemon, staticMenus.pokemon.categories)
    const gymFilters = genGyms(gyms, staticMenus.gyms.categories)
    const stopFilters = genPokestops(
      pokemon,
      pokestops,
      staticMenus.pokestops.categories,
    )

    setMenuFilters({ ...gymFilters, ...stopFilters, ...pokeFilters })
  }, [pokemon, gyms, pokestops, staticMenus])
}
