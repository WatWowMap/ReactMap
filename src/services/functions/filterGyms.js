/* eslint-disable no-restricted-syntax */
import { useStore, useMasterfile } from '../../hooks/useStore'
import getPokemonIcon from './getPokemonIcon'

export default function filterGyms(tempFilters, menus, search) {
  const availableForms = useMasterfile(state => state.availableForms)
  const masterfile = useMasterfile(state => state.masterfile)
  const { path } = useStore(state => state.settings).icons
  const { menus: { gyms } } = useMasterfile(state => state.ui)
  const filteredArr = []
  const filteredObj = {}

  const {
    teams, eggs, categories, bosses, others,
  } = menus

  const tempAdvFilter = {}
  const searchTerms = []
  let switchKey

  Object.keys(menus).forEach(category => {
    tempAdvFilter[category] = Object.values(menus[category]).every(val => val === false)
  })
  tempAdvFilter.all = Object.values(tempAdvFilter).every(val => val === true)

  const addGym = (id, name) => {
    const raidCheck = (id.startsWith('p') && gyms.raids) || (id.startsWith('e') && gyms.raids)
    const gymCheck = (id.startsWith('g') && gyms.gyms) || (id.startsWith('t') && gyms.gyms)
    if (raidCheck || gymCheck) {
      let urlBuilder
      switch (id.charAt(0)) {
        default: urlBuilder = `/images/gym/${id.slice(1).replace('-', '_')}`; break
        case 'e': urlBuilder = `/images/egg/${id.slice(1)}`; break
        case 'p': urlBuilder = `${path}/${getPokemonIcon(availableForms, ...id.slice(1).split('-'))}`; break
      }
      const url = `url(${urlBuilder}.png)`
      filteredArr.push({ id, name, url })
      filteredObj[id] = { ...tempFilters[id] }
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

  Object.keys(tempFilters).forEach(id => {
    const gym = id.startsWith('p') ? masterfile.pokemon[id.slice(1).split('-')[0]] : masterfile.gyms[id]
    if (id.startsWith('p')) {
      gym.category = 'bosses'
      if (gym.rarity === 'Legendary') {
        gym.level = 'legendary'
      } else if (gym.rarity === 'mythical') {
        gym.level = 'mythical'
      } else {
        gym.level = 'others'
      }
    }
    switch (switchKey) {
      default:
        if (categories[gym.category]
          || teams[gym.team]
          || eggs[gym.level]
          || bosses[gym.level]) {
          addGym(id, gym.name)
        } break
      case 'all': addGym(id, gym.name); break
      case 'selected': if (tempFilters[id].enabled) addGym(id, gym.name); break
      case 'unselected': if (!tempFilters[id].enabled) addGym(id, gym.name); break
      case 'search': {
        const meta = [gym.team, gym.slots, gym.level, gym.category].join(' ').toLowerCase()
        searchTerms.forEach(term => {
          if (typeof term === 'string') {
            if (meta.includes(term)) addGym(id, gym.name)
          } else {
            const andCheck = term.every(subTerm => meta.includes(subTerm))
            if (andCheck) addGym(id, gym.name)
          }
        })
      } break
      case 'reverse': {
        if ((tempAdvFilter.categories || categories[gym.category])
          && (tempAdvFilter.teams || teams[gym.team])
          && (tempAdvFilter.eggs || eggs[gym.level])) {
          addGym(id, gym.name)
        } break
      }
    }
  })
  return { filteredObj, filteredArr }
}
