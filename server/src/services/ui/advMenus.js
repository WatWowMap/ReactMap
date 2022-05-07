const { Event } = require('../initialization')
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
    Object.values(Event.masterfile.pokemon)
      .map(val => `generation_${val.genId}`),
  )].filter(val => val !== undefined),
  types: Object.keys(Event.masterfile.types)
    .map(key => `poke_type_${key}`)
    .filter(val => val !== 'poke_type_0'),
  rarity: [...new Set(
    Object.values(Event.masterfile.pokemon)
      .map(val => val.rarity),
  )].filter(val => val !== undefined),
  forms: ['normalForms', 'altForms', 'Alola', 'Galarian'],
  others: ['reverse', 'selected', 'unselected', 'onlyAvailable'],
}

module.exports = function buildMenus() {
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
          onlyAvailable: true,
        },
        categories: Object.fromEntries(items.map(item => [item, false])),
      },
    }
  })
  return returnedItems
}
