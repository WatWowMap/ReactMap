/* eslint-disable no-restricted-syntax */
module.exports = function generateUi(filters) {
  const filterItems = {}

  for (const [key, value] of Object.entries(filters)) {
    const list = ['pokemon', 'gyms', 'pokestops', 'spawnpoints', 's2Cells', 'submissionCells', 'portals', 'weather', 'devices']
    if (list.includes(key) && value) filterItems[key] = true
    if (key === 'pokemon' && filters.pokemon) {
      filterItems.pokemon = {}
      const secondary = ['pokemon', 'iv', 'stats', 'pvp']

      for (let i = 0; i < secondary.length; i += 1) {
        if (filters[secondary[i]]) filterItems.pokemon[secondary[i]] = true
      }
    }
    if (key === 'pokestops') {
      filterItems.pokestops = {}
      const secondary = ['pokestops', 'lures', 'quests', 'invasions']

      for (let i = 0; i < secondary.length; i += 1) {
        if (filters[secondary[i]]) filterItems.pokestops[secondary[i]] = true
      }
    }
    if (key === 'gyms') {
      filterItems.gyms = {}
      const secondary = ['gyms', 'raids']

      for (let i = 0; i < secondary.length; i += 1) {
        if (filters[secondary[i]]) filterItems.gyms[secondary[i]] = true
      }
    }
  }
  const menuItems = ['areas', 'stats', 'search', 'settings', 'clearCache', 'discord', 'logout']

  return { filterItems, menuItems }
}
