const { GenericFilter } = require('../../models/index')

module.exports = function buildGyms(perms) {
  const gymFilters = {}

  if (perms.gyms) {
    for (let i = 0; i <= 3; i += 1) {
      gymFilters[`t${i}-0`] = new GenericFilter()
      if (i) {
        for (let j = 1; j <= 6; j += 1) {
          gymFilters[`g${i}-${j}`] = new GenericFilter()
        }
      }
    }
  }
  if (perms.raids) {
    [1, 3, 5, 6].forEach(tier => {
      gymFilters[`e${tier}`] = new GenericFilter()
    })
  }
  return gymFilters
}
