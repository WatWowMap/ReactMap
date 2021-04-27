module.exports = function buildPokemonMenu() {
  const categories = {
    generations: ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unova', 'Kalos', 'Alola', 'Galar'],
    types: ['Bug', 'Dark', 'Dragon', 'Electric', 'Fairy', 'Fighting', 'Fire', 'Flying', 'Ghost', 'Grass', 'Ground', 'Ice', 'Normal', 'Poison', 'Psychic', 'Rock', 'Steel', 'Water'],
    forms: ['altForms', 'Alola', 'Galarian'],
    rarity: ['Common', 'Uncommon', 'Rare', 'UltraRare', 'Regional', 'Event', 'Legendary', 'Mythical'],
    others: ['reverse', 'selected', 'unselected'],
  }

  const returnedItems = {}
  Object.entries(categories).forEach(category => {
    const [key, items] = category
    returnedItems[key] = {}
    items.forEach(item => returnedItems[key][item] = false)
  })
  return returnedItems
}
