module.exports = function buildGyms(perms) {
  const gymFilters = {}

  if (perms) {
    gymFilters.exOnly = true
    gymFilters.inBattle = true

    for (let i = 0; i <= 3; i += 1) {
      gymFilters[`g${i}`] = true

      if (i) {
        for (let j = 1; j <= 6; j += 1) {
          gymFilters[`g${i}-${j}`] = true
        }
      }
    }
  }
  return gymFilters
}
