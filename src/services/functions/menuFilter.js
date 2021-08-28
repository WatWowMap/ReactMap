/* eslint-disable no-restricted-syntax */
import { useStatic } from '@hooks/useStore'
import { useTranslation } from 'react-i18next'

export default function menuFilter(tempFilters, menus, search, type) {
  const masterfile = useStatic(state => state.masterfile)
  const Icons = useStatic(state => state.Icons)
  const { [type]: available } = useStatic(state => state.available)
  const { pokestops: stopPerms, gyms: gymPerms } = useStatic(state => state.ui)
  const { [type]: { filter } } = useStatic(state => state.filters)
  const { t } = useTranslation()

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
    if ((type === 'pokemon')
      || (type === 'pokestops' && stopPerms.quests)
      || (type === 'gyms' && gymPerms.raids)
      || type === 'nests') {
      show += 1
      const url = Icons.getPokemon(...id.split('-'))
      filteredArr.push({ id, name, url })
      filteredObj[id] = { ...tempFilters[id] }
    }
  }

  const addPokestop = (id, stop) => {
    const stopCheck = id.startsWith('s') && stopPerms.pokestops
    const lureCheck = id.startsWith('l') && stopPerms.lures
    const questCheck = (!Number.isNaN(parseInt(id.charAt(0))) || id.startsWith('m') || id.startsWith('q') || id.startsWith('d') || id.startsWith('c')) && stopPerms.quests
    const invasionsCheck = id.startsWith('i') && stopPerms.invasions

    if ((stopCheck || lureCheck || questCheck || invasionsCheck) && stop.name) {
      show += 1
      let urlBuilder
      switch (id.charAt(0)) {
        case 'i': urlBuilder = Icons.getInvasions(id.slice(1)); break
        case 'c': urlBuilder = Icons.getRewards(4, ...id.slice(1).split('-')); break
        case 'd': urlBuilder = Icons.getRewards(3, id.slice(1)); break
        case 'q': urlBuilder = Icons.getRewards(2, ...id.slice(1).split('-')); break
        case 'l': urlBuilder = Icons.getPokestops(id.slice(1)); break
        case 'm': urlBuilder = Icons.getPokemon(...id.slice(1).split('-'), 1); break
        default: urlBuilder = Icons.getPokemon(...id.split('-')); break
      }
      const url = urlBuilder
      filteredArr.push({ id, name: stop.name, url })
      filteredObj[id] = { ...tempFilters[id] }
    }
  }

  const addGym = (id, gym) => {
    const raidCheck = (!Number.isNaN(parseInt(id.charAt(0))) && gymPerms.raids) || (id.startsWith('e') && gymPerms.raids)
    const gymCheck = (id.startsWith('g') && gymPerms.gyms) || (id.startsWith('t') && gymPerms.gyms)
    if ((raidCheck || gymCheck) && gym.name) {
      show += 1
      let url
      switch (id.charAt(0)) {
        case 'e': url = Icons.getEggs(id.slice(1)); break
        case 't':
        case 'g': url = Icons.getGyms(...id.slice(1).split('-')); break
        default: url = Icons.getPokemon(...id.split('-')); break
      }
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
    Object.keys(filter).forEach(id => {
      if (id !== 'global' && Number.isNaN(parseInt(id.charAt(0)))) {
        total += 1
        let pokestop = {}
        switch (id.charAt(0)) {
          case 'i':
            pokestop.category = 'invasions'
            pokestop.name = t(`grunt_a_${id.slice(1)}`, `grunt_${id.slice(1)}`); break
          case 'd':
            pokestop = { name: `x${id.slice(1)}` } || {}
            pokestop.category = 'items'; break
          case 'm':
            pokestop = { name: `${t(`poke_${id.slice(1).split('-')[0]}`)} x${id.split('-')[1]}` } || {}
            pokestop.category = 'energy'; break
          case 'q':
            pokestop.name = t(`item_${id.slice(1)}`)
            pokestop.category = 'items'; break
          case 'l':
            pokestop.name = t(`lure_${id.slice(1)}`)
            pokestop.category = 'lures'; break
          case 'c':
            pokestop.name = `${t(`poke_${id.slice(1)}`)} ${t('candy')}`
            pokestop.category = 'candy'; break
          default: pokestop.category = 'pokestops'; break
        }
        switch (switchKey) {
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
          default:
            if (categories[pokestop.category]) {
              addPokestop(id, pokestop)
            } break
        }
      }
    })
  }

  if (type === 'gyms') {
    Object.keys(filter).forEach(id => {
      if (id !== 'global'
        && Number.isNaN(parseInt(id.charAt(0)))
        && !id.startsWith('g')) {
        total += 1
        const gym = {}
        switch (id.charAt(0)) {
          case 'e':
            gym.name = t(id)
            gym.category = 'eggs'; break
          case 't':
            gym.name = t(`team_${id.slice(1).split('-')[0]}`)
            gym.category = 'teams'; break
          default:
            gym.name = t(id)
            gym.category = ''; break
        }
        switch (switchKey) {
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
          default:
            if (categories[gym.category]) {
              addGym(id, gym)
            } break
        }
      }
    })
  }

  for (const [i, pkmn] of Object.entries(masterfile.pokemon)) {
    for (const [j, form] of Object.entries(pkmn.forms)) {
      const id = `${i}-${j}`
      let displayName = form.name && form.name !== 'Normal' && j != 0 && j != pkmn.defaultFormId
        ? t(`form_${j}`)
        : t(`poke_${i}`)
      if (form.name === '*') {
        if (type === 'pokestops') {
          displayName = `${displayName}*`
        } else {
          // eslint-disable-next-line no-continue
          continue
          // todo: remove continue
        }
      }
      const formTypes = (form.types || pkmn.types || []).map(typeId => masterfile.types[typeId])
      total += 1
      pkmn.category = 'pokemon'
      switch (switchKey) {
        case 'all': addPokemon(id, displayName); break
        case 'selected': if (tempFilters[id].enabled) addPokemon(id, displayName); break
        case 'unselected': if (!tempFilters[id].enabled) addPokemon(id, displayName); break
        case 'available':
          if (available.includes(id)
            && (tempAdvFilter.generations || generations[pkmn.generation])
            && (tempAdvFilter.types || typeResolver(formTypes))
            && (tempAdvFilter.rarity || rarity[pkmn.rarity])
            && (tempAdvFilter.forms || (forms.altForms ? j != pkmn.defaultFormId : forms[displayName]))) {
            addPokemon(id, displayName)
          } break
        case 'search': {
          const meta = [...formTypes, pkmn.name, displayName, pkmn.rarity, pkmn.generation].join(' ').toLowerCase()
          searchTerms.forEach(term => {
            if (typeof term === 'string') {
              if ((meta.includes(term))
                || pkmn.pokedexId == term) {
                addPokemon(id, displayName)
              }
            } else {
              const andCheck = term.every(subTerm => meta.includes(subTerm))
              if (andCheck) addPokemon(id, displayName)
            }
          })
        } break
        case 'reverse': {
          if ((tempAdvFilter.generations || generations[pkmn.generation])
            && (tempAdvFilter.types || typeResolver(formTypes))
            && (tempAdvFilter.rarity || rarity[pkmn.rarity])
            && (tempAdvFilter.forms || (forms.altForms ? j != pkmn.defaultFormId : forms[displayName]))) {
            addPokemon(id, displayName)
          } break
        }
        default:
          if (generations[pkmn.generation]
            || types[masterfile.types[formTypes[0]]] || types[masterfile.types[formTypes[1]]]
            || rarity[pkmn.rarity]
            || (forms[displayName] || (forms.altForms && j != pkmn.defaultFormId))
            || categories[pkmn.category]) {
            if (forms.altForms || categories[pkmn.category]) {
              addPokemon(id, displayName)
            } else if (j == pkmn.defaultFormId || forms[displayName]) {
              addPokemon(id, displayName)
            }
          } break
      }
    }
  }
  return { filteredObj, filteredArr, count: { total, show } }
}
