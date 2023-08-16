import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { useStatic } from '@hooks/useStore'

const filteringPokemon = [
  'pokemon',
  'quest_reward_4',
  'quest_reward_9',
  'quest_reward_12',
]

export default function useFilter(
  tempFilters,
  menus,
  search,
  category,
  webhookCategory,
  reqCategories,
) {
  const { t } = useTranslation()
  const {
    available,
    Icons,
    auth: { perms },
    masterfile: { pokemon },
    menuFilters,
  } = useStatic.getState()

  const {
    filters: {
      generations,
      types,
      rarity,
      historicRarity,
      forms,
      others,
      categories,
    },
  } = menus[category]
  const tempAdvFilter = {}
  const filteredArr = []
  const filteredObj = {}
  const searchTerms = []
  const count = { total: 0, show: 0 }
  let switchKey

  Object.keys(menus[category].filters).forEach((subCategory) => {
    tempAdvFilter[subCategory] = Object.values(
      menus[category].filters[subCategory],
    ).every((val) => val === false)
  })

  if (
    (others.selected && others.unselected) ||
    Object.values(tempAdvFilter).every((val) => val === true)
  ) {
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
    item.url = Icons.getIconById(id)
    filteredObj[id] = tempFilters[id]
    filteredArr.push(item)
  }

  const evalSearchTerms = (term) => {
    if (term.includes('&')) {
      searchTerms.push(term.split('&'))
    }
    if (term.includes('+')) {
      const cleaned = term.slice(1)
      const families = Object.keys(pokemon).filter((id) => {
        const name = t(`poke_${id}`)
        return name.toLowerCase().includes(cleaned)
      })
      if (families && term.slice(1)) {
        const familyIds = families.map((item) => +pokemon[item].family)
        searchTerms.push(...new Set(familyIds))
      }
    }
    searchTerms.push(term)
  }

  const typeResolver = (pkmnTypes) => {
    let typeCount = 0
    Object.values(types).forEach((pkmnType) => {
      if (pkmnType) typeCount += 1
    })
    if (typeCount === 2) {
      return types[pkmnTypes[0]] && types[pkmnTypes[1]]
    }
    if (typeCount === 1) {
      return types[pkmnTypes[0]] || types[pkmnTypes[1]]
    }
  }

  if (search) {
    switchKey = 'search'
    search = search.replace(/,/g, '|')
    if (search.includes('|')) {
      const orSplit = search.split('|').map((term) => term.trim())
      orSplit.forEach((term) => {
        evalSearchTerms(term)
      })
    } else {
      evalSearchTerms(search)
    }
  }

  if (!reqCategories) {
    reqCategories = Object.keys(categories)
  }

  reqCategories.forEach((subCategory) => {
    Object.entries(menuFilters[subCategory] || {}).forEach(([id, item]) => {
      if (
        item.perms.some((perm) => perms[perm]) &&
        (item.webhookOnly ? webhookCategory && tempFilters[id] : true)
      ) {
        if (
          !item.name.endsWith('*') ||
          (item.name.endsWith('*') && category === item.category)
        ) {
          count.total += 1
          item.id = id
          switch (switchKey) {
            case 'all':
              addItem(id, item)
              break
            case 'selected':
              if (tempFilters[id]?.enabled) addItem(id, item)
              break
            case 'unselected':
              if (!tempFilters[id]?.enabled) addItem(id, item)
              break
            case 'reverse':
              if (filteringPokemon.includes(subCategory) || item.webhookOnly) {
                if (
                  ((tempAdvFilter.generations || generations[item.genId]) &&
                    (tempAdvFilter.types || typeResolver(item.formTypes)) &&
                    (tempAdvFilter.rarity ||
                      rarity[item.rarity] ||
                      Object.entries(rarity).some(([k, v]) => v && item[k])) &&
                    (tempAdvFilter.historicRarity ||
                      historicRarity[item.historic]) &&
                    (tempAdvFilter.categories || categories[subCategory]) &&
                    (tempAdvFilter.forms ||
                      forms[item.formName] ||
                      (forms.altForms && item.formId != item.defaultFormId) ||
                      (forms.normalForms &&
                        item.formId === item.defaultFormId))) ||
                  item.webhookOnly
                ) {
                  addItem(id, item)
                }
              } else if (
                tempAdvFilter.categories ||
                categories[subCategory] ||
                item.webhookOnly
              ) {
                addItem(id, item)
              }
              break
            case 'available':
              if (
                available?.[category]?.includes(id) ||
                id.startsWith('t') ||
                item.webhookOnly
              ) {
                if (filteringPokemon.includes(subCategory)) {
                  if (
                    ((tempAdvFilter.generations || generations[item.genId]) &&
                      (tempAdvFilter.types || typeResolver(item.formTypes)) &&
                      (tempAdvFilter.rarity ||
                        rarity[item.rarity] ||
                        Object.entries(rarity).some(
                          ([k, v]) => v && item[k],
                        )) &&
                      (tempAdvFilter.historicRarity ||
                        historicRarity[item.historic]) &&
                      (tempAdvFilter.categories || categories[subCategory]) &&
                      (tempAdvFilter.forms ||
                        forms[item.formName] ||
                        (forms.altForms && item.formId != item.defaultFormId) ||
                        (forms.normalForms &&
                          item.formId === item.defaultFormId))) ||
                    item.webhookOnly
                  ) {
                    addItem(id, item)
                  }
                } else if (
                  tempAdvFilter.categories ||
                  categories[subCategory] ||
                  item.webhookOnly
                ) {
                  addItem(id, item)
                }
              }
              break
            case 'search':
              searchTerms.forEach((term) => {
                const meta = item.searchMeta || item.name
                switch (typeof term) {
                  case 'string':
                    term = term.trim()
                    if (meta.includes(term) || item.pokedexId == term) {
                      addItem(id, item)
                    }
                    break
                  case 'number':
                    if (item.family === term) addItem(id, item)
                    break
                  default:
                    if (term.every((subTerm) => meta.includes(subTerm)))
                      addItem(id, item)
                }
              })
              break
            default:
              if (filteringPokemon.includes(subCategory)) {
                if (
                  generations[item.genId] ||
                  item.formTypes.some((x) => types[x]) ||
                  rarity[item.rarity] ||
                  Object.entries(rarity).some(([k, v]) => v && item[k]) ||
                  historicRarity[item.historic] ||
                  forms[item.name] ||
                  (forms.altForms && item.formId != item.defaultFormId) ||
                  (forms.normalForms && item.formId === item.defaultFormId) ||
                  categories[subCategory] ||
                  item.webhookOnly
                ) {
                  addItem(id, item)
                }
              } else if (categories[subCategory] || item.webhookOnly) {
                addItem(id, item)
              }
              break
          }
        }
      }
    })
  })

  useEffect(() => () => useStatic.setState({ excludeList: [] }))

  return { filteredObj, filteredArr, count }
}
