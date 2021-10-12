const categories = {
  gyms: ['teams', 'eggs', 'raids', 'pokemon'],
  pokestops: ['lures', 'items', 'energy', 'invasions', 'pokemon', 'candy'],
  pokemon: ['pokemon'],
  nests: ['pokemon'],
}

const pokemonFilters = {
  generations: ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar'],
  types: ['Bug', 'Dark', 'Dragon', 'Electric', 'Fairy', 'Fighting', 'Fire', 'Flying', 'Ghost', 'Grass', 'Ground', 'Ice', 'Normal', 'Poison', 'Psychic', 'Rock', 'Steel', 'Water'],
  forms: ['altForms', 'Alola', 'Galarian'],
  rarity: ['common', 'uncommon', 'rare', 'ultraRare', 'regional', 'event', 'legendary', 'mythical'],
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
