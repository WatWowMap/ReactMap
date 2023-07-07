const BaseFilter = require('../Base')
const { Event } = require('../../initialization')
const { map } = require('../../config')

module.exports = function buildPokestops(perms, defaults, available) {
  const quests = { s0: new BaseFilter() }
  if (perms.quests) {
    Object.keys(Event.masterfile.items).forEach((item) => {
      quests[`q${item}`] = new BaseFilter(defaults.items)
      if (Event.masterfile.items[item]?.includes('Troy Disk') && perms.lures) {
        quests[`l${item}`] = new BaseFilter(defaults.lures)
      }
    })
    for (
      let i = defaults.stardust.min;
      i <= defaults.stardust.max;
      i += defaults.stardust.interval
    ) {
      quests[`d${i}`] = new BaseFilter(defaults.stardust.enabled)
    }
    Object.keys(Event.masterfile.questRewardTypes).forEach((type) => {
      if (type !== '0') {
        quests[`u${type}`] = new BaseFilter(defaults.rewardTypes)
      }
    })
    for (
      let i = defaults.xp.min;
      i <= defaults.xp.max;
      i += defaults.xp.interval
    ) {
      quests[`p${i}`] = new BaseFilter(defaults.xp.enabled)
    }
    Object.keys(Event.masterfile.questRewardTypes).forEach((type) => {
      if (type !== '0') {
        quests[`u${type}`] = new BaseFilter(defaults.rewardTypes)
      }
    })
  }
  if (perms.invasions) {
    Object.keys(Event.invasions).forEach((type) => {
      if (type !== '0') {
        quests[`i${type}`] = new BaseFilter(defaults.allInvasions)
      }
    })
  }
  available.pokestops.forEach((avail) => {
    if (perms.lures && avail.startsWith('l')) {
      quests[avail] = new BaseFilter(defaults.lures)
    }
    if (perms.quests) {
      if (avail.startsWith('q')) {
        quests[avail] = new BaseFilter(defaults.items)
      }
      if (avail.startsWith('d')) {
        quests[avail] = new BaseFilter(defaults.stardust.enabled)
      }
      if (avail.startsWith('u')) {
        quests[avail] = new BaseFilter(defaults.rewardTypes)
      }
    }
    if (perms.invasions) {
      if (avail.startsWith('i')) {
        quests[avail] = new BaseFilter(defaults.allInvasions)
      }
      if (avail.startsWith('a') && map.enableConfirmedInvasions) {
        quests[avail] = new BaseFilter(defaults.invasionPokemon)
      }
    }
    if (perms.eventStops && avail.startsWith('b')) {
      quests[avail] = new BaseFilter(defaults.eventStops)
    }
  })
  return quests
}
