/* eslint-disable no-restricted-syntax */
import { useStore, useMasterfile } from '../../hooks/useStore'
import getPokemonIcon from './getPokemonIcon'

export default function filterPokestops(tempFilters, menus, search) {
  const availableForms = useMasterfile(state => state.availableForms)
  const masterfile = useMasterfile(state => state.masterfile)
  const { path } = useStore(state => state.settings).icons
  const { menus: { pokestops: perms } } = useMasterfile(state => state.ui)
  const filteredArr = []
  const filteredObj = {}

  const {
    categories, others,
  } = menus

  const tempAdvFilter = {}
  const searchTerms = []
  let switchKey
  let total = 0
  let show = 0

  Object.keys(menus).forEach(category => {
    tempAdvFilter[category] = Object.values(menus[category]).every(val => val === false)
  })
  tempAdvFilter.all = Object.values(tempAdvFilter).every(val => val === true)

  const addPokestop = (id, name) => {
    show += 1
    let urlBuilder
    const stopCheck = id.startsWith('s') && perms.pokestops
    const lureCheck = id.startsWith('l') && perms.lures
    const questCheck = (id.startsWith('p') || id.startsWith('m') || id.startsWith('q') || id.startsWith('d')) && perms.quests
    const invasionsCheck = id.startsWith('i') && perms.invasions

    if (stopCheck || lureCheck || questCheck || invasionsCheck) {
      switch (id.charAt(0)) {
        default: urlBuilder = '/images/pokestop/0'; break
        case 'i': urlBuilder = `/images/invasion/i0_${id.slice(1)}`; break
        case 'd': urlBuilder = '/images/item/-1'; break
        case 'q': urlBuilder = `/images/item/${id.slice(1)}`; break
        case 'l': urlBuilder = `/images/pokestop/${id == 0 ? id : id.slice(-1)}`; break
        case 'm': urlBuilder = `${path}/${getPokemonIcon(availableForms, id.slice(1).split('-')[0], 0, 1)}`; break
        case 'p': urlBuilder = `${path}/${getPokemonIcon(availableForms, ...id.slice(1).split('-'))}`
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
    total += 1
    let pokestop = {}
    switch (id.charAt(0)) {
      default: pokestop.category = 'pokestops'; break
      case 'p':
        pokestop = masterfile.pokemon[id.slice(1).split('-')[0]]
        pokestop.category = 'pokemon'; break
      case 'i':
        pokestop = masterfile.invasions[id.slice(1)]
        pokestop.category = 'invasions'
        pokestop.name = pokestop.type; break
      case 'd':
        pokestop = { name: `Stardust x${id.slice(1)}` }
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
        pokestop.category = 'pokestops'; break
    }
    switch (switchKey) {
      default:
        if (categories[pokestop.category]) {
          addPokestop(id, pokestop.name)
        } break
      case 'all': addPokestop(id, pokestop.name); break
      case 'selected': if (tempFilters[id].enabled) addPokestop(id, pokestop.name); break
      case 'unselected': if (!tempFilters[id].enabled) addPokestop(id, pokestop.name); break
      case 'search': {
        const meta = [pokestop.name, pokestop.category].join(' ').toLowerCase()
        searchTerms.forEach(term => {
          if (typeof term === 'string') {
            if (meta.includes(term)) addPokestop(id, pokestop.name)
          } else {
            const andCheck = term.every(subTerm => meta.includes(subTerm))
            if (andCheck) addPokestop(id, pokestop.name)
          }
        })
      } break
      case 'reverse': {
        if ((tempAdvFilter.categories || categories[pokestop.category])) {
          addPokestop(id, pokestop.name)
        } break
      }
    }
  })
  return { filteredObj, filteredArr, count: { total, show } }
}
