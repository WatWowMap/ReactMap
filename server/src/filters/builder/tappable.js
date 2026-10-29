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
    switch (key.charAt(0)) {
      case 'c':
        filters[key] = new BaseFilter(defaults.candy)
        break
      case 'x':
        filters[key] = new BaseFilter(defaults.xlCandy)
        break
      case 'm':
        filters[key] = new BaseFilter(defaults.megaEnergy)
        break
      default:
        filters[key] = new BaseFilter(defaults.items)
    }
  })

  return filters
}

module.exports = { buildTappables }
