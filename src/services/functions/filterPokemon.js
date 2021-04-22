/* eslint-disable no-restricted-syntax */
import { useMasterfile } from '../../hooks/useStore'

export default function filterPokemon(tempFilters, filters, search) {
  const masterfile = useMasterfile(state => state.masterfile).pokemon
  const filteredPokes = []
  const filteredPokesObj = {}

  for (const [i, pkmn] of Object.entries(masterfile)) {
    for (const [j, form] of Object.entries(pkmn.forms)) {
      const id = `${i}-${j}`
      let formName = form.name || 'Normal'
      formName = formName === 'Normal' ? '' : formName
      const name = formName === '' ? pkmn.name : formName

      if (search !== '') {
        if (([...pkmn.types, pkmn.name, pkmn.rarity, pkmn.generation].join(' ').toLowerCase()).includes(search)
          || pkmn.pokedex_id == search) {
          filteredPokes.push({ id, name })
          filteredPokesObj[id] = { ...tempFilters[id] }
        }
      } else if (filters.generations[pkmn.generation]
        || filters.types[pkmn.types[0]]
        || filters.types[pkmn.types[1]]
        || filters.rarities[pkmn.rarity]
        || (filters.rarities.Legendary && pkmn.legendary)
        || (filters.rarities.Mythical && pkmn.mythical)) {
        if (!filters.others.allForms) {
          if (j == pkmn.default_form_id || formName === '') {
            filteredPokes.push({ id, name })
            filteredPokesObj[id] = { ...tempFilters[id] }
          }
        } else {
          filteredPokes.push({ id, name })
          filteredPokesObj[id] = { ...tempFilters[id] }
        }
      }
    }
  }
  return { filteredPokesObj, filteredPokes }
}
