// @ts-check
const config = require('@rm/config')

/** Golbat checks at most this many player ids per scan */
const MAX_PLAYERS = 50

/**
 * The `max` of every `authentication.perms.personalShiny.limits` entry the
 * roles match. Kept as a list on the perms, so the perms of linked accounts
 * merge into all of them.
 * @param {string[]} roles discord roles, telegram groups or local statuses
 * @returns {number[]}
 */
function personalShinyLimits(roles) {
  return config
    .getSafe('authentication.perms.personalShiny.limits')
    .filter((limit) => limit.roles.some((role) => roles.includes(role)))
    .map((limit) => Math.max(0, Math.floor(Number(limit.max) || 0)))
}

/**
 * How many player accounts the user may save: the highest matching limit,
 * otherwise `defaultMax`
 * @param {import('@rm/types').Permissions | undefined} perms
 * @returns {number}
 */
function getPersonalShinyMax(perms) {
  if (!perms?.personalShiny) return 0
  if (perms.admin) return MAX_PLAYERS
  const limits = perms.personalShinyLimits || []
  const max = limits.length
    ? Math.max(...limits)
    : Math.max(
        0,
        Math.floor(
          Number(
            config.getSafe('authentication.perms.personalShiny.defaultMax'),
          ) || 0,
        ),
      )
  return Math.min(MAX_PLAYERS, max)
}

module.exports = { MAX_PLAYERS, personalShinyLimits, getPersonalShinyMax }
