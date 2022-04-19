const { GenericFilter } = require('../../models/index')
const { Event } = require('../initialization')

module.exports = function buildGyms(perms, defaults) {
  const gymFilters = {}

  if (perms.gyms) {
    for (let i = 0; i <= 3; i += 1) {
      gymFilters[`t${i}-0`] = new GenericFilter(defaults.allGyms)
      if (i) {
        for (let j = 1; j <= 6; j += 1) {
          gymFilters[`g${i}-${j}`] = new GenericFilter(defaults.allGyms)
        }
      }
    }
  }
  if (perms.raids) {
    Event.available.gyms.forEach(avail => {
      if (avail.startsWith('e')) {
        gymFilters[avail] = new GenericFilter(defaults.eggs)
      }
      if (avail.startsWith('r')) {
        gymFilters[avail] = new GenericFilter(defaults.raids)
      }
    })
  }
  return gymFilters
}
