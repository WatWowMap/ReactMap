import { useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import genPokemon from '@services/filtering/genPokemon'
import genGyms from '@services/filtering/genGyms'
import genPokestops from '@services/filtering/genPokestops'

import { useStatic } from '@hooks/useStore'

export default function useGenerate() {
  const { t } = useTranslation()
  const { pokemon } = useStatic(useCallback(s => s.masterfile, []))
  const { gyms, pokestops } = useStatic(useCallback(s => s.filters, []))
  const staticMenus = useStatic(useCallback(s => s.menus, []))

  const pokeFilters = useMemo(() => genPokemon(t, pokemon, staticMenus.pokemon.categories), [])
  const gymFilters = useMemo(() => genGyms(t, gyms, staticMenus.gyms.categories), [])
  const stopFilters = useMemo(() => genPokestops(t, pokemon, pokestops, staticMenus.pokestops.categories), [])

  return {
    ...gymFilters,
    ...stopFilters,
    ...pokeFilters,
  }
}
