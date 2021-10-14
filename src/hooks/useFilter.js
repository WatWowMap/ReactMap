import { useTranslation } from 'react-i18next'
import { useStatic } from '@hooks/useStore'
import { useCallback } from 'react'

export default function useFilter(tempFilters, menus, search, type, reqCategories) {
  const { t } = useTranslation()
  const menuFilters = useStatic(useCallback(s => s.menuFilters, []))
  const available = useStatic(useCallback(s => s.available, []))
  const { perms } = useStatic(useCallback(s => s.auth, []))
  const { pokemon } = useStatic(useCallback(s => s.masterfile, []))

  const {
    filters: {
      generations, types, rarity, forms, others, categories,
    },
  } = menus[type]

  const tempAdvFilter = {}
  const filteredArr = []
  const filteredObj = {}
  const searchTerms = []
  const count = { total: 0, show: 0 }
  let switchKey

  Object.keys(menus[type].filters).forEach(category => {
    tempAdvFilter[category] = Object.values(menus[type].filters[category]).every(val => val === false)
  })
  tempAdvFilter.all = Object.values(tempAdvFilter).every(val => val === true)

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

  const addItem = (id, item) => {
    count.show += 1
    filteredObj[id] = item
    filteredArr.push(item)
  }

  const evalSearchTerms = term => {
    if (term.includes('&')) {
      searchTerms.push(term.split('&'))
    }
    if (term.includes('+')) {
      const cleaned = term.slice(1)
      const families = Object.keys(pokemon).filter(id => {
        const name = t(`poke_${id}`)
        return (name.toLowerCase().includes(cleaned))
      })
      if (families) {
        const familyIds = families.map(item => +pokemon[item].family)
        searchTerms.push(...new Set(familyIds))
      }
    }
    searchTerms.push(term)
  }

  const typeResolver = pkmTypes => {
    let typeCount = 0
    Object.values(types).forEach(pkmnType => {
      if (pkmnType) typeCount += 1
    })
    if (typeCount === 2) {
      return types[pkmTypes[0]] && types[pkmTypes[1]]
    }
    if (typeCount === 1) {
      return types[pkmTypes[0]] || types[pkmTypes[1]]
    }
  }

  if (search) {
    switchKey = 'search'
    search = search.replace(/,/g, '|')
    if (search.includes('|')) {
      const orSplit = search.split('|').map(term => term.trim())
      orSplit.forEach(term => {
        evalSearchTerms(term)
      })
    } else {
      evalSearchTerms(search)
    }
  }

  if (!reqCategories) {
    reqCategories = Object.keys(categories)
  }

  reqCategories.forEach(category => {
    Object.entries(menuFilters[category] || {}).forEach(([id, item]) => {
      if (perms[item.perm]) {
        count.total += 1
        item.id = id
        switch (switchKey) {
          case 'all': addItem(id, item); break
          case 'selected': if (tempFilters[id].enabled) addItem(id, item); break
          case 'unselected': if (!tempFilters[id].enabled) addItem(id, item); break
          case 'reverse':
            if (category === 'pokemon' || category === 'energy' || category === 'candy') {
              if ((tempAdvFilter.generations || generations[item.genId])
                && (tempAdvFilter.types || typeResolver(item.formTypes))
                && (tempAdvFilter.rarity || rarity[item.rarity])
                && (tempAdvFilter.forms || (forms.altForms ? item.formId != item.defaultFormId : forms[item.name]))) {
                addItem(id, item)
              }
            } else if ((tempAdvFilter.categories || categories[category])) {
              addItem(id, item)
            } break
          case 'available':
            if ((available?.[type].includes(id) || id.startsWith('t'))
              && (tempAdvFilter.categories || categories[category])) {
              addItem(id, item)
            } break
          case 'search': {
            const meta = Object.values(item).map(x => x).join(' ').toLowerCase()
            searchTerms.forEach(term => {
              switch (typeof term) {
                case 'string':
                  term = term.trim()
                  if ((meta.includes(term))
                    || item.pokedexId == term) {
                    addItem(id, item)
                  } break
                case 'number':
                  if (item.family === term) addItem(id, item); break
                default:
                  if (term.every(subTerm => meta.includes(subTerm))) addItem(id, item)
              }
            })
          } break
          default:
            if (category === 'pokemon' || category === 'energy' || category === 'candy') {
              if (generations[item.genId]
                || item.formTypes.some(x => types[x])
                || rarity[item.rarity]
                || (forms[item.name] || (forms.altForms && item.formId != item.defaultFormId))
                || categories[category]) {
                if (forms.altForms || categories[category]) {
                  addItem(id, item)
                } else if (item.formId == item.defaultFormId || forms[item.name]) {
                  addItem(id, item)
                }
              }
            } else if (categories[category]) {
              addItem(id, item)
            } break
        }
      }
    })
  })

  return { filteredObj, filteredArr, count }
}
