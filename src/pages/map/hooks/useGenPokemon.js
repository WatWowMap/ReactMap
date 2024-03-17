// @ts-check
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'

export function useGenPokemon() {
  const { t } = useTranslation()
  const pokemon = useMemory((s) => s.masterfile.pokemon)
  const categories = useMemory((s) => s.menus.pokemon.categories)

  useEffect(() => {
    /** @type {import('@rm/types').ClientFilterObj} */
    const tempObj = Object.fromEntries(
      categories.map((x) => [
        x,
        {
          '0-0': {
            webhookOnly: true,
            name: t('poke_global'),
            perms: ['pokemon', 'raids', 'quests', 'nests'],
            formTypes: [],
          },
        },
      ]),
    )

    Object.entries(pokemon).forEach(([i, pkmn]) => {
      const pokeName = t(`poke_${i}`)
      Object.entries(pkmn.forms).forEach(([j, form]) => {
        const formName = t(`form_${j}`)
        const id = `${i}-${j}`
        const formTypes = (form.types || pkmn.types || []).map(
          (x) => `poke_type_${x}`,
        )
        const name =
          form.name &&
          form.name !== 'Normal' &&
          j !== '0' &&
          +j !== pkmn.defaultFormId
            ? formName
            : pokeName
        tempObj.pokemon[id] = {
          name: form.name === '*' ? `${name}*` : name,
          category: form.name === '*' ? form.category : undefined,
          pokedexId: +i,
          formId: +j,
          defaultFormId: pkmn.defaultFormId,
          pokeName,
          formName,
          formTypes,
          rarity: form.rarity || pkmn.rarity,
          historic: pkmn.historic,
          legendary: pkmn.legendary,
          mythical: pkmn.mythical,
          ultraBeast: pkmn.ultraBeast,
          genId: `generation_${pkmn.genId}`,
          perms: ['pokemon', 'raids', 'quests', 'nests'],
          family: pkmn.family,
        }
        tempObj.pokemon[id].searchMeta = `${Object.entries(tempObj.pokemon[id])
          .flatMap(([k, v]) =>
            Array.isArray(v)
              ? v.map((y) => t(y))
              : typeof v === 'boolean'
              ? v
                ? t(k)
                : ''
              : t(v),
          )
          .join(' ')
          .toLowerCase()} ${t('pokemon').toLowerCase()}`
      })
    })
    useMemory.setState((prev) => ({
      menuFilters: { ...prev.menuFilters, ...tempObj },
    }))
  }, [pokemon, categories, t])
}
