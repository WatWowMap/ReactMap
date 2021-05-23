/* eslint-disable no-restricted-syntax */
import { useStore, useStatic } from '@hooks/useStore'
import getPokemonIcon from './getPokemonIcon'

export default function filterPokemon(tempFilters, menus, search, type) {
  const masterfile = useStatic(state => state.masterfile)
  const availableForms = useStatic(state => state.availableForms)
  const { path } = useStore(state => state.settings).icons
  const { [type]: available } = useStatic(state => state.available)
  const { menus: { pokestops: stopPerms, gyms: gymPerms } } = useStatic(state => state.ui)
  const { [type]: { filter } } = useStatic(state => state.staticFilters)

  const {
    filters: {
      generations, types, rarity, forms, others, categories,
    },
  } = menus[type]

  const tempAdvFilter = {}
  const filteredArr = []
  const filteredObj = {}
  const searchTerms = []
  let switchKey
  let total = 0
  let show = 0

  Object.keys(menus[type].filters).forEach(category => {
    tempAdvFilter[category] = Object.values(menus[type].filters[category]).every(val => val === false)
  })
  tempAdvFilter.all = Object.values(tempAdvFilter).every(val => val === true)

  const addPokemon = (id, name) => {
    show += 1
    if ((type === 'pokemon') || (type === 'pokestops' && stopPerms.quests) || (type === 'gyms' && gymPerms.raids)) {
      const url = `${path}/${getPokemonIcon(availableForms, ...id.split('-'))}.png`
      filteredArr.push({ id, name, url })
      filteredObj[id] = { ...tempFilters[id] }
    }
  }

  const addPokestop = (id, stop) => {
    const stopCheck = id.startsWith('s') && stopPerms.pokestops
    const lureCheck = id.startsWith('l') && stopPerms.lures
    const questCheck = (!Number.isNaN(parseInt(id.charAt(0))) || id.startsWith('m') || id.startsWith('q') || id.startsWith('d')) && stopPerms.quests
    const invasionsCheck = id.startsWith('i') && stopPerms.invasions

    if (stopCheck || lureCheck || questCheck || invasionsCheck) {
      show += 1
      let urlBuilder
      switch (id.charAt(0)) {
        default: urlBuilder = `${path}/${getPokemonIcon(availableForms, ...id.split('-'))}`; break
        case 'i': urlBuilder = `/images/invasion/i0_${id.slice(1)}`; break
        case 'd': urlBuilder = '/images/item/-1'; break
        case 'q': urlBuilder = `/images/item/${id.slice(1)}`; break
        case 'l': urlBuilder = `/images/pokestop/${id == 0 ? id : id.slice(-1)}`; break
        case 'm': urlBuilder = `${path}/${getPokemonIcon(availableForms, id.slice(1).split('-')[0], 0, (id.slice(1).split('-')[0] == 6 || id.slice(1).split('-')[0] == 150) ? 2 : 1)}`; break
      }
      const url = `${urlBuilder}.png`
      filteredArr.push({ id, name: stop.name, url })
      filteredObj[id] = { ...tempFilters[id] }
    }
  }

  const addGym = (id, gym) => {
    const raidCheck = (!Number.isNaN(parseInt(id.charAt(0))) && gymPerms.raids) || (id.startsWith('e') && gymPerms.raids)
    const gymCheck = (id.startsWith('g') && gymPerms.gyms) || (id.startsWith('t') && gymPerms.gyms)
    if (raidCheck || gymCheck) {
      show += 1
      let urlBuilder
      switch (id.charAt(0)) {
        default: urlBuilder = `${path}/${getPokemonIcon(availableForms, ...id.split('-'))}`; break
        case 'e': urlBuilder = `/images/egg/${id.slice(1)}`; break
        case 't':
        case 'g': urlBuilder = `/images/gym/${id.slice(1).replace('-', '_')}`; break
      }
      const url = `${urlBuilder}.png`
      filteredArr.push({ id, name: gym.name, url })
      filteredObj[id] = { ...tempFilters[id] }
    }
  }

  const typeResolver = pkmnTypes => {
    let typeCount = 0
    Object.values(types).forEach(pkmnType => {
      if (pkmnType) typeCount += 1
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
  } else if (others.onlyAvailable) {
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

  if (type === 'pokestops') {
    Object.keys(tempFilters).forEach(id => {
      if (id !== 'ivAnd' && Number.isNaN(parseInt(id.charAt(0)))) {
        total += 1
        let pokestop = {}
        switch (id.charAt(0)) {
          default: pokestop.category = 'pokestops'; break
          case 'i':
            pokestop = masterfile.invasions[id.slice(1)]
            pokestop.category = 'invasions'
            pokestop.name = pokestop.type; break
          case 'd':
            pokestop = { name: `x${id.slice(1)}` }
            pokestop.category = 'items'; break
          case 'm':
            pokestop = { name: `${masterfile.pokemon[id.slice(1).split('-')[0]].name} x${id.split('-')[1]}` }
            pokestop.category = 'energy'; break
          case 'q':
            pokestop = masterfile.items[id.slice(1)]
            pokestop.category = 'items'; break
          case 'l':
            pokestop = masterfile.items[id.slice(1)]
            pokestop.name = id === 'l501' ? 'Lure' : pokestop.name
            pokestop.category = 'lures'; break
        }
        switch (switchKey) {
          default:
            if (categories[pokestop.category]) {
              addPokestop(id, pokestop)
            } break
          case 'all': addPokestop(id, pokestop); break
          case 'selected': if (tempFilters[id].enabled) addPokestop(id, pokestop); break
          case 'unselected': if (!tempFilters[id].enabled) addPokestop(id, pokestop); break
          case 'available':
            if (available.includes(id)
              && (tempAdvFilter.categories || categories[pokestop.category])) {
              addPokestop(id, pokestop)
            } break
          case 'search': {
            const meta = [pokestop.name, pokestop.category].join(' ').toLowerCase()
            searchTerms.forEach(term => {
              if (typeof term === 'string') {
                if (meta.includes(term)) addPokestop(id, pokestop)
              } else {
                const andCheck = term.every(subTerm => meta.includes(subTerm))
                if (andCheck) addPokestop(id, pokestop)
              }
            })
          } break
          case 'reverse': {
            if ((tempAdvFilter.categories || categories[pokestop.category])) {
              addPokestop(id, pokestop)
            } break
          }
        }
      }
    })
  }

  if (type === 'gyms') {
    Object.keys(filter).forEach(id => {
      if (id !== 'ivAnd'
        && Number.isNaN(parseInt(id.charAt(0)))
        && !id.startsWith('g')) {
        total += 1
        const gym = masterfile.gyms[id]
        switch (switchKey) {
          default:
            if (categories[gym.category]) {
              addGym(id, gym)
            } break
          case 'all': addGym(id, gym); break
          case 'selected': if (tempFilters[id].enabled) addGym(id, gym); break
          case 'unselected': if (!tempFilters[id].enabled) addGym(id, gym); break
          case 'available':
            if ((available.includes(id) || id.startsWith('t'))
              && (tempAdvFilter.categories || categories[gym.category])) {
              addGym(id, gym)
            } break
          case 'search': {
            const meta = [gym.team, gym.slots, gym.level, gym.category].join(' ').toLowerCase()
            searchTerms.forEach(term => {
              if (typeof term === 'string') {
                if (meta.includes(term)) addGym(id, gym)
              } else {
                const andCheck = term.every(subTerm => meta.includes(subTerm))
                if (andCheck) addGym(id, gym)
              }
            })
          } break
          case 'reverse': {
            if ((tempAdvFilter.categories || categories[gym.category])) {
              addGym(id, gym)
            } break
          }
        }
      }
    })
  }

  for (const [i, pkmn] of Object.entries(masterfile.pokemon)) {
    for (const [j, form] of Object.entries(pkmn.forms)) {
      const id = `${i}-${j}`
      let formName = form.name || 'Normal'
      formName = formName === 'Normal' ? '' : formName
      const name = formName === '' ? pkmn.name : formName
      const formTypes = form.types || pkmn.types
      total += 1
      pkmn.category = 'pokemon'
      switch (switchKey) {
        default:
          if (generations[pkmn.generation]
            || types[formTypes[0]] || types[formTypes[1]]
            || rarity[pkmn.rarity]
            || (forms[name] || (forms.altForms && j != pkmn.default_form_id))
            || categories[pkmn.category]) {
            if (forms.altForms) {
              addPokemon(id, name)
            } else if (j == pkmn.default_form_id || forms[name]) {
              addPokemon(id, name)
            }
          } break
        case 'all': addPokemon(id, name); break
        case 'selected': if (tempFilters[id].enabled) addPokemon(id, name); break
        case 'unselected': if (!tempFilters[id].enabled) addPokemon(id, name); break
        case 'available':
          if (available.includes(id)
            && (tempAdvFilter.categories || categories[pkmn.category])) {
            addPokemon(id, name)
          } break
        case 'search': {
          const meta = [...formTypes, pkmn.name, formName, pkmn.rarity, pkmn.generation].join(' ').toLowerCase()
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
