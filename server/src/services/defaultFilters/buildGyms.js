const { GenericFilter } = require('../../models/index')

module.exports = function buildGyms(perms, defaults, available) {
  const gymFilters = {}

  if (perms.gyms) {
    defaults.baseTeamIds.forEach((team, i) => {
      gymFilters[`t${team}-0`] = new GenericFilter(defaults.allGyms)
      if (i) {
        defaults.baseGymSlotAmounts.forEach((slot) => {
          gymFilters[`g${team}-${slot}`] = new GenericFilter(defaults.allGyms)
        })
      }
    })
  }
  if (perms.raids) {
    defaults.baseRaidTiers.forEach((tier) => {
      gymFilters[`e${tier}`] = new GenericFilter(defaults.eggs)
      gymFilters[`r${tier}`] = new GenericFilter(defaults.raids)
    })
  }
  available.gyms.forEach((avail) => {
    if (perms.gyms && (avail.startsWith('t') || avail.startsWith('g'))) {
      gymFilters[avail] = new GenericFilter(defaults.allGyms)
    }
    if (perms.raids) {
      if (avail.startsWith('e')) {
        gymFilters[avail] = new GenericFilter(defaults.eggs)
      }
      if (avail.startsWith('r')) {
        gymFilters[avail] = new GenericFilter(defaults.raids)
      }
    }
  })
  return gymFilters
}
