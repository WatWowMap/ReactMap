import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { useGetDeepStore, useStorage } from '@store/useStorage'
import { useEffect } from 'react'
import { useWebhookStore } from '@store/useWebhookStore'

const filteringPokemon = [
  'pokemon',
  'quest_reward_4',
  'quest_reward_9',
  'quest_reward_12',
]

export function useFilter(category, webhookCategory, reqCategories) {
  const { t } = useTranslation()
  const tempFilters = webhookCategory
    ? useWebhookStore((s) => s.tempFilters)
    : useStorage((s) => s.filters[category].filter)

  const search = useGetDeepStore(`searches.${category}Advanced`, '')
    .toLowerCase()
    .trim()
  const {
    available,
    auth: { perms },
    masterfile: { pokemon },
    menuFilters,
  } = useMemory.getState()
  const menus = useStorage((s) => s.menus[category].filters)
  const {
    generations,
    types,
    rarity,
    historicRarity,
    forms,
    others,
    categories,
  } = menus

  const tempAdvFilter = {}
  const filteredArr = []
  const searchTerms = []
  const count = { total: 0, show: 0 }
  let switchKey

  Object.keys(menus).forEach((subCategory) => {
    tempAdvFilter[subCategory] = Object.values(menus[subCategory]).every(
      (val) => val === false,
    )
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

  const addItem = (id) => {
    count.show += 1
    filteredArr.push(id)
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
    const clean = search.replace(/,/g, '|')
    if (clean.includes('|')) {
      const orSplit = clean.split('|').map((term) => term.trim())
      orSplit.forEach((term) => {
        evalSearchTerms(term)
      })
    } else {
      evalSearchTerms(clean)
    }
  }

  const c = reqCategories ?? Object.keys(menuFilters)

  c.forEach((subCategory) => {
    Object.entries(menuFilters[subCategory] || {}).forEach(([id, item]) => {
      if (
        item.perms.some((perm) => perms[perm]) &&
        (item.webhookOnly
          ? webhookCategory && tempFilters[id]
          : tempFilters[id])
      ) {
        if (
          !item.name.endsWith('*') ||
          (item.name.endsWith('*') && category === item.category)
        ) {
          count.total += 1
          item.id = id
          switch (switchKey) {
            case 'all':
              addItem(id)
              break
            case 'selected':
              if (tempFilters[id]?.enabled) addItem(id)
              break
            case 'unselected':
              if (!tempFilters[id]?.enabled) addItem(id)
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
                  addItem(id)
                }
              } else if (
                tempAdvFilter.categories ||
                categories[subCategory] ||
                item.webhookOnly
              ) {
                addItem(id)
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
                    addItem(id)
                  }
                } else if (
                  tempAdvFilter.categories ||
                  categories[subCategory] ||
                  item.webhookOnly
                ) {
                  addItem(id)
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
                      addItem(id)
                    }
                    break
                  case 'number':
                    if (item.family === term) addItem(id)
                    break
                  default:
                    if (term.every((subTerm) => meta.includes(subTerm)))
                      addItem(id)
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
                  addItem(id)
                }
              } else if (categories[subCategory] || item.webhookOnly) {
                addItem(id)
              }
              break
          }
        }
      }
    })
  })

  useEffect(() => {
    useMemory.setState((prev) => ({
      advMenuCounts: {
        ...prev.advMenuCounts,
        [category]: count,
      },
      advMenuFiltered: {
        ...prev.advMenuFiltered,
        [category]: filteredArr,
      },
    }))
  }, [count, filteredArr])

  return filteredArr
}
