const BaseFilter = require('../Base')

module.exports = function buildGyms(perms, defaults, available) {
  const gymFilters = {}

  if (perms.gyms) {
    defaults.baseTeamIds.forEach((team, i) => {
      gymFilters[`t${team}-0`] = new BaseFilter(defaults.allGyms)
      if (i) {
        defaults.baseGymSlotAmounts.forEach((slot) => {
          gymFilters[`g${team}-${slot}`] = new BaseFilter(defaults.allGyms)
        })
      }
    })
  }
  if (perms.raids) {
    defaults.baseRaidTiers.forEach((tier) => {
      gymFilters[`e${tier}`] = new BaseFilter(defaults.eggs)
      gymFilters[`r${tier}`] = new BaseFilter(defaults.raids)
    })
  }
  available.gyms.forEach((avail) => {
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
