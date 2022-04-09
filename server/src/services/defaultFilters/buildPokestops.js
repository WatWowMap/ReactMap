const { GenericFilter } = require('../../models/index')
const {
  Event: { masterfile: { items, questRewardTypes }, invasions },
} = require('../initialization')

module.exports = function buildPokestops(perms, defaults) {
  const quests = { s0: new GenericFilter() }
  if (perms.lures) {
    for (let i = 1; i <= 5; i += 1) {
      quests[`l50${i}`] = new GenericFilter(defaults.lures)
    }
  }
  if (perms.quests) {
    Object.keys(items).forEach(item => {
      quests[`q${item}`] = new GenericFilter(defaults.items)
    })
    for (let i = 200; i <= 2000; i += 100) {
      quests[`d${i}`] = new GenericFilter(defaults.items)
    }
    Object.keys(questRewardTypes).forEach(type => {
      if (type !== '0') {
        quests[`u${type}`] = new GenericFilter()
      }
    })
  }
  if (perms.invasions) {
    Object.keys(invasions).forEach(type => {
      if (type != 0) {
        quests[`i${type}`] = new GenericFilter(defaults.allInvasions)
      }
    })
  }
  return quests
}
