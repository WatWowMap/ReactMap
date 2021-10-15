const masterfile = require('../../data/masterfile.json')
const { map } = require('../config')

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
  forms: ['altForms', 'Alola', 'Galarian'],
  others: ['reverse', 'selected', 'unselected', 'onlyAvailable'],
}

module.exports = function buildMenus() {
  const menuFilters = {}
  const returnedItems = {}

  Object.entries(pokemonFilters).forEach(filter => {
    const [key, items] = filter
    menuFilters[key] = {}
    items.forEach(item => menuFilters[key][item] = item === 'onlyAvailable')
  })

  Object.entries(categories).forEach(category => {
    const [key, items] = category
    returnedItems[key] = {
      categories: items,
      filters: { ...menuFilters, categories: {} },
    }
    items.forEach(item => returnedItems[key].filters.categories[item] = false)
  })
  return returnedItems
}
