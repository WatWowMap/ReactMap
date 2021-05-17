/* eslint-disable no-restricted-syntax */
import { useStore, useMasterfile } from '../../hooks/useStore'
import getPokemonIcon from './getPokemonIcon'

export default function filterPokemon(tempFilters, menus, search) {
  const masterfile = useMasterfile(state => state.masterfile).pokemon
  const availableForms = useMasterfile(state => state.availableForms)
  const { path } = useStore(state => state.settings).icons

  const {
    generations, types, rarity, forms, others,
  } = menus
  const tempAdvFilter = {}
  const filteredArr = []
  const filteredObj = {}
  const searchTerms = []
  let switchKey
  let total = 0
  let show = 0

  Object.keys(menus).forEach(category => {
    tempAdvFilter[category] = Object.values(menus[category]).every(val => val === false)
  })
  tempAdvFilter.all = Object.values(tempAdvFilter).every(val => val === true)

  const addPokemon = (id, name) => {
    show += 1
    const url = `url(${path}/${getPokemonIcon(availableForms, ...id.split('-'))}.png)`
    filteredArr.push({ id, name, url })
    filteredObj[id] = { ...tempFilters[id] }
  }

  const typeResolver = pkmnTypes => {
    let typeCount = 0
    Object.values(types).forEach(type => {
      if (type) typeCount += 1
    })
    if (typeCount === 2) {
      return types[pkmnTypes[0]] && types[pkmnTypes[1]]
    }
    if (typeCount === 1) {
      return types[pkmnTypes[0]] || types[pkmnTypes[1]]
    }
  }

  if ((others.selected && others.unselected) || tempAdvFilter.all) {
    switchKey = 'all'
  } else if (others.selected) {
    switchKey = 'selected'
  } else if (others.unselected) {
    switchKey = 'unselected'
  } else if (others.reverse) {
    switchKey = 'reverse'
  } else if (others.available) {
    switchKey = 'available'
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
      total += 1
      switch (switchKey) {
        default:
          if (generations[pkmn.generation]
            || types[formTypes[0]] || types[formTypes[1]]
            || rarity[pkmn.rarity]
            || (forms[name] || (forms.altForms && j != pkmn.default_form_id))) {
            if (forms.altForms) {
              addPokemon(id, name)
            } else if (j == pkmn.default_form_id || forms[name]) {
              addPokemon(id, name)
            }
          } break
        case 'all': addPokemon(id, name); break
        case 'selected': if (tempFilters[id].enabled) addPokemon(id, name); break
        case 'unselected': if (!tempFilters[id].enabled) addPokemon(id, name); break
        case 'available': if (form.available) addPokemon(id, name); break
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
        case 'reverse': {
          if ((tempAdvFilter.generations || generations[pkmn.generation])
            && (tempAdvFilter.types || typeResolver(formTypes))
            && (tempAdvFilter.rarity || rarity[pkmn.rarity])
            && (tempAdvFilter.forms || (forms.altForms ? j != pkmn.default_form_id : forms[name]))) {
            addPokemon(id, name)
          } break
        }
      }
    }
  }
  return { filteredObj, filteredArr, count: { total, show } }
}
