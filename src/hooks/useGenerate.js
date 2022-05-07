import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import genPokemon from '@services/filtering/genPokemon'
import genGyms from '@services/filtering/genGyms'
import genPokestops from '@services/filtering/genPokestops'

import { useStatic } from '@hooks/useStore'

export default function useGenerate() {
  const { t } = useTranslation()
  const { pokemon } = useStatic(s => s.masterfile)
  const { gyms, pokestops } = useStatic(s => s.filters)
  const staticMenus = useStatic(s => s.menus)
  const setMenuFilters = useStatic(s => s.setMenuFilters)

  useEffect(() => {
    const pokeFilters = genPokemon(t, pokemon, staticMenus.pokemon.categories)
    const gymFilters = genGyms(t, gyms, staticMenus.gyms.categories)
    const stopFilters = genPokestops(t, pokemon, pokestops, staticMenus.pokestops.categories)

    setMenuFilters({ ...gymFilters, ...stopFilters, ...pokeFilters })
  }, [localStorage.getItem('i18nextLng'), pokemon])
}
