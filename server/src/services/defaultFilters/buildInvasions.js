const { GenericFilter } = require('../../models/index')

module.exports = function buildInvasions(perms) {
  const invasions = perms ? {} : undefined

  if (invasions) {
    for (let i = 1; i <= 50; i += 1) {
      invasions[`i${i}`] = new GenericFilter()
    }
  }
  return invasions
}
