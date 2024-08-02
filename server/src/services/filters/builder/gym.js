// @ts-check
const state = require('../../state')
const BaseFilter = require('../Base')

/**
 *
 * @param {import("@rm/types").Permissions} perms
 * @param {import("@rm/types").Config['defaultFilters']['gyms']} defaults
 */
function buildGyms(perms, defaults) {
  const gymFilters = /** @type {Record<string, BaseFilter>} */ ({})

  if (perms.gyms) {
    Object.keys(state.event.masterfile.teams).forEach((team, i) => {
      gymFilters[`t${team}-0`] = new BaseFilter(defaults.allGyms)
      if (i) {
        defaults.baseGymSlotAmounts.forEach((slot) => {
          gymFilters[`g${team}-${slot}`] = new BaseFilter(defaults.allGyms)
        })
      }
    })
  }
  if (perms.raids) {
    Object.keys(state.event.masterfile.raids).forEach((tier) => {
      if (tier !== '0') {
        gymFilters[`e${tier}`] = new BaseFilter(defaults.eggs)
        gymFilters[`r${tier}`] = new BaseFilter(defaults.raids)
      }
    })
  }
  state.event.getAvailable('gyms').forEach((avail) => {
    if (perms.gyms && (avail.startsWith('t') || avail.startsWith('g'))) {
      gymFilters[avail] = new BaseFilter(defaults.allGyms)
    }
    if (perms.raids) {
      if (avail.startsWith('e')) {
        gymFilters[avail] = new BaseFilter(defaults.eggs)
      }
      if (avail.startsWith('r')) {
        gymFilters[avail] = new BaseFilter(defaults.raids)
      }
    }
  })
  return gymFilters
}

module.exports = buildGyms
