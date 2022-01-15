const masterfile = require('../../data/masterfile.json')
const { map, api: { queryAvailable } } = require('../config')

const categories = {
  gyms: ['teams', 'eggs', 'raids', 'pokemon'],
  pokestops: ['lures', 'items', 'quest_reward_12', 'invasions', 'pokemon', 'quest_reward_4', 'quest_reward_9', 'quest_reward_3'],
  pokemon: ['pokemon'],
  nests: ['pokemon'],
}

if (map.enableQuestRewardTypeFilters) {
  categories.pokestops.push('general')
}

const pokemonFilters = {
  generations: [...new Set(
    Object.values(masterfile.pokemon)
      .map(val => `generation_${val.genId}`),
  )].filter(val => val !== undefined),
  types: Object.keys(masterfile.types)
    .map(key => `poke_type_${key}`)
    .filter(val => val !== 'poke_type_0'),
  rarity: [...new Set(
    Object.values(masterfile.pokemon)
      .map(val => val.rarity),
  )].filter(val => val !== undefined),
  forms: ['normalForms', 'altForms', 'Alola', 'Galarian'],
  others: ['reverse', 'selected', 'unselected', 'onlyAvailable'],
}

const getQueryCategory = (subCategory) => {
  switch (subCategory) {
    case 'pokestops': return 'quests'
    case 'gyms': return 'raids'
    default: return subCategory
  }
}

module.exports = function buildMenus(available) {
  const menuFilters = {}
  const returnedItems = {}

  Object.entries(pokemonFilters).forEach(([key, items]) => {
    menuFilters[key] = Object.fromEntries(items.map(item => [item, false]))
  })

  Object.entries(categories).forEach(([key, items]) => {
    returnedItems[key] = {
      categories: items,
      filters: {
        ...menuFilters,
        others: {
          ...menuFilters.others,
          onlyAvailable: available[key]?.length ? queryAvailable[getQueryCategory(key)] : undefined,
        },
        categories: Object.fromEntries(items.map(item => [item, false])),
      },
    }
  })
  return returnedItems
}
