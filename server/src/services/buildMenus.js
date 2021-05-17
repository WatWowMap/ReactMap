const categories = {
  gyms: {
    categories: ['teams', 'slots', 'eggs', 'bosses'],
    teams: ['neutral', 'instinct', 'mystic', 'valor'],
    eggs: ['1Star', '3Star', '5Star', 'mega'],
    bosses: ['others', 'legendary', 'mythical'],
    others: ['reverse', 'selected', 'unselected'],
  },
  pokemon: {
    generations: ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar'],
    types: ['Bug', 'Dark', 'Dragon', 'Electric', 'Fairy', 'Fighting', 'Fire', 'Flying', 'Ghost', 'Grass', 'Ground', 'Ice', 'Normal', 'Poison', 'Psychic', 'Rock', 'Steel', 'Water'],
    forms: ['altForms', 'Alola', 'Galarian'],
    rarity: ['Common', 'Uncommon', 'Rare', 'UltraRare', 'Regional', 'Event', 'Legendary', 'Mythical'],
    others: ['reverse', 'selected', 'unselected', 'available'],
  },
  pokestops: {
    categories: ['pokestops', 'items', 'energy', 'invasions', 'pokemon'],
    others: ['reverse', 'selected', 'unselected'],
  },
}

module.exports = function buildMenus() {
  const returnedItems = {}

  Object.entries(categories).forEach(category => {
    const [key, items] = category
    returnedItems[key] = {}
    Object.entries(items).forEach(subCategory => {
      const [subKey, subItems] = subCategory
      returnedItems[key][subKey] = {}
      subItems.forEach(item => returnedItems[key][subKey][item] = false)
    })
  })
  return returnedItems
}
