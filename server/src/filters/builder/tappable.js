// @ts-check
const { state } = require('../../services/state')
const { BaseFilter } = require('../Base')

/**
 * @param {import('@rm/types').Permissions} perms
 * @param {import('@rm/types').Config['defaultFilters']['tappables']} defaults
 * @returns {Record<string, BaseFilter>}
 */
function buildTappables(perms, defaults) {
  const filters = { q0: new BaseFilter() }
  if (!perms.tappables) {
    return filters
  }

  Object.keys(state.event.masterfile.items).forEach((itemId) => {
    filters[`q${itemId}`] = new BaseFilter(defaults.items)
  })

  state.event.getAvailable('tappables').forEach((key) => {
    if (filters[key]) return
    if (key.startsWith('c')) {
      filters[key] = new BaseFilter(defaults.candy)
    } else if (key.startsWith('x')) {
      filters[key] = new BaseFilter(defaults.xlCandy)
    } else if (key.startsWith('m')) {
      filters[key] = new BaseFilter(defaults.megaEnergy)
    } else if (Number.isInteger(Number(key.charAt(0)))) {
      filters[key] = new BaseFilter(defaults.pokemon)
    } else {
      filters[key] = new BaseFilter(defaults.items)
    }
  })

  return filters
}

module.exports = { buildTappables }
