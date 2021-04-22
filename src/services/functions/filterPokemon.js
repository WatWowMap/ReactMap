/* eslint-disable no-restricted-syntax */
import { useMasterfile } from '../../hooks/useStore'

export default function filterPokemon(tempFilters, filters, search) {
  const masterfile = useMasterfile(state => state.masterfile).pokemon
  const {
    generations, types, rarities, others,
  } = filters
  const tempAdvFilter = {}
  const filteredPokes = []
  const filteredPokesObj = {}
  const searchTerms = []
  let switchKey

  const addPokemon = (id, name) => {
    filteredPokes.push({ id, name })
    filteredPokesObj[id] = { ...tempFilters[id] }
  }

  if (others.selected) switchKey = 'selected'
  if (others.advanced) {
    switchKey = 'advanced'
    Object.keys(filters).forEach(category => {
      tempAdvFilter[category] = Object.values(filters[category]).every(val => val === false)
    })
  }

  if (search !== '') {
    switchKey = 'search'
    if (search.includes('|')) {
      searchTerms.push(...search.split('|'))
    } else if (search.includes('&')) {
      searchTerms.push(search.split('&'))
    } else {
      searchTerms.push(search)
    }
  }

  for (const [i, pkmn] of Object.entries(masterfile)) {
    for (const [j, form] of Object.entries(pkmn.forms)) {
      const id = `${i}-${j}`
      let formName = form.name || 'Normal'
      formName = formName === 'Normal' ? '' : formName
      const name = formName === '' ? pkmn.name : formName
      const formTypes = form.types || pkmn.types

      switch (switchKey) {
        default:
          if (generations[pkmn.generation]
            || types[formTypes[0]] || types[formTypes[1]]
            || rarities[pkmn.rarity]) {
            if (others.allForms) {
              addPokemon(id, name)
            } else if (j == pkmn.default_form_id || formName === '') {
              addPokemon(id, name)
            }
          } break
        case 'selected': if (tempFilters[id].enabled) addPokemon(id, name); break
        case 'search': {
          const meta = [...formTypes, name, formName, pkmn.rarity, pkmn.generation].join(' ').toLowerCase()
          searchTerms.forEach(term => {
            if (typeof term === 'string') {
              if ((meta.includes(term))
                || pkmn.pokedex_id == term) {
                addPokemon(id, name)
              }
            } else {
              const andCheck = term.every(subTerm => meta.includes(subTerm))
              if (andCheck) addPokemon(id, name)
            }
          })
        } break
        case 'advanced': {
          if ((tempAdvFilter.generations ? true : generations[pkmn.generation])
            && (tempAdvFilter.types ? true : (types[formTypes[0]] || types[formTypes[1]]))
            && (tempAdvFilter.rarities ? true : rarities[pkmn.rarity])) {
            addPokemon(id, name)
          } break
        }
      }
    }
  }
  return { filteredPokesObj, filteredPokes }
}
