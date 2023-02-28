const { GenericFilter } = require('../../models/index')
const { Event } = require('../initialization')

module.exports = function buildPokestops(perms, defaults, available) {
  const quests = { s0: new GenericFilter() }
  if (perms.quests) {
    Object.keys(Event.masterfile.items).forEach((item) => {
      quests[`q${item}`] = new GenericFilter(defaults.items)
      if (Event.masterfile.items[item]?.includes('Troy Disk') && perms.lures) {
        quests[`l${item}`] = new GenericFilter(defaults.lures)
      }
    })
    for (
      let i = defaults.stardust.min;
      i <= defaults.stardust.max;
      i += defaults.stardust.interval
    ) {
      quests[`d${i}`] = new GenericFilter(defaults.stardust.enabled)
    }
    Object.keys(Event.masterfile.questRewardTypes).forEach((type) => {
      if (type !== '0') {
        quests[`u${type}`] = new GenericFilter(defaults.rewardTypes)
      }
    })
    for (
      let i = defaults.xp.min;
      i <= defaults.xp.max;
      i += defaults.xp.interval
    ) {
      quests[`p${i}`] = new GenericFilter(defaults.xp.enabled)
    }
    Object.keys(Event.masterfile.questRewardTypes).forEach((type) => {
      if (type !== '0') {
        quests[`u${type}`] = new GenericFilter(defaults.rewardTypes)
      }
    })
  }
  if (perms.invasions) {
    Object.keys(Event.invasions).forEach((type) => {
      if (type !== '0') {
        quests[`i${type}`] = new GenericFilter(defaults.allInvasions)
      }
    })
  }
  available.pokestops.forEach((avail) => {
    if (perms.lures && avail.startsWith('l')) {
      quests[avail] = new GenericFilter(defaults.lures)
    }
    if (perms.quests) {
      if (avail.startsWith('q')) {
        quests[avail] = new GenericFilter(defaults.items)
      }
      if (avail.startsWith('d')) {
        quests[avail] = new GenericFilter(defaults.stardust.enabled)
      }
      if (avail.startsWith('u')) {
        quests[avail] = new GenericFilter(defaults.rewardTypes)
      }
    }
    if (perms.invasions && avail.startsWith('i')) {
      quests[avail] = new GenericFilter(defaults.allInvasions)
    }
  })
  return quests
}
