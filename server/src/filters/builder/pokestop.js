// @ts-check
const { log, TAGS } = require('@rm/logger')

const BaseFilter = require('../Base')
const state = require('../../services/state')

/**
 *
 * @param {import("@rm/types").Permissions} perms
 * @param {import("@rm/types").Config['defaultFilters']['pokestops']} defaults
 * @returns {Record<string, BaseFilter>}
 */
function buildPokestops(perms, defaults) {
  const quests = { s0: new BaseFilter() }
  if (perms.quests) {
    Object.keys(state.event.masterfile.items).forEach((item) => {
      quests[`q${item}`] = new BaseFilter(defaults.items)
      if (
        state.event.masterfile.items[item]?.includes('Troy Disk') &&
        perms.lures
      ) {
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
    Object.keys(state.event.masterfile.questRewardTypes).forEach((type) => {
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
    Object.keys(state.event.masterfile.questRewardTypes).forEach((type) => {
      if (type !== '0') {
        quests[`u${type}`] = new BaseFilter(defaults.rewardTypes)
      }
    })
  }
  if (perms.invasions) {
    Object.keys(state.event.invasions).forEach((type) => {
      if (type !== '0') {
        quests[`i${type}`] = new BaseFilter(defaults.allInvasions)
      }
    })
  }
  state.event.getAvailable('pokestops').forEach((avail) => {
    if (perms.lures && avail.startsWith('l')) {
      quests[avail] = new BaseFilter(defaults.lures)
    }
    if (perms.quests) {
      if (avail.startsWith('q')) {
        quests[avail] = new BaseFilter(defaults.items)
      } else if (avail.startsWith('d')) {
        quests[avail] = new BaseFilter(defaults.stardust.enabled)
      } else if (avail.startsWith('u')) {
        quests[avail] = new BaseFilter(defaults.rewardTypes)
      } else if (avail.startsWith('p')) {
        quests[avail] = new BaseFilter(defaults.xp.enabled)
      } else if (avail.startsWith('c')) {
        quests[avail] = new BaseFilter(defaults.candy)
      } else if (avail.startsWith('x')) {
        quests[avail] = new BaseFilter(defaults.xlCandy)
      } else if (avail.startsWith('m')) {
        quests[avail] = new BaseFilter(defaults.megaEnergy)
      } else if (
        !avail.startsWith('i') &&
        !avail.startsWith('l') &&
        !avail.startsWith('a') &&
        !avail.startsWith('b') &&
        !avail.startsWith('f') &&
        !avail.startsWith('h') &&
        !Number.isInteger(+avail.charAt(0))
      ) {
        log.warn(
          TAGS.available,
          `Unknown quest type: ${avail} probably should open a PR or issue`,
        )
        quests[avail] = new BaseFilter(true)
      }
    }
    if (perms.invasions) {
      if (avail.startsWith('i')) {
        quests[avail] = new BaseFilter(defaults.allInvasions)
      }
      if (
        avail.startsWith('a') &&
        state.db.filterContext.Pokestop.hasConfirmedInvasions
      ) {
        quests[avail] = new BaseFilter(defaults.invasionPokemon)
      }
    }
    if (perms.eventStops && avail.startsWith('b')) {
      quests[avail] = new BaseFilter(defaults.eventStops)
    }
    if (perms.eventStops && (avail.startsWith('f') || avail.startsWith('h'))) {
      quests[avail] = new BaseFilter(defaults.showcasePokemon)
    }
  })
  return quests
}

module.exports = buildPokestops
