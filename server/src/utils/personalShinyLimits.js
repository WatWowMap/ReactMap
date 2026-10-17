// @ts-check
const config = require('@rm/config')

/** Absolute cap on saved player ids per user ("unlimited" means this many) */
const HARD_MAX = 50

/**
 * The `max` values of every `authentication.perms.personalShiny.limits` entry
 * whose roles match. Kept as an array so mergePerms() unions it when a user
 * links several accounts; the highest limit wins (0 = unlimited).
 * @param {string[]} roles discord roles, telegram groups or local statuses,
 *  and the user's own Discord / Telegram id, so an entry can name single users
 * @returns {number[]}
 */
function personalShinyLimits(roles) {
  const limits = config.getSafe('authentication.perms.personalShiny')?.limits
  if (!Array.isArray(limits)) return []
  return limits
    .filter(
      (limit) =>
        Array.isArray(limit?.roles) &&
        limit.roles.some((role) => roles.includes(role)),
    )
    .map((limit) => Math.max(0, Number(limit.max) || 0))
}

/**
 * How many player ids this user may save. 0 hides the feature for this user.
 * @param {import('@rm/types').Permissions | undefined} perms
 * @returns {number}
 */
function getPersonalShinyMax(perms) {
  if (!perms?.personalShiny) return 0
  if (perms.admin) return HARD_MAX
  const matched = /** @type {number[]} */ (perms.personalShinyLimits || [])
  if (matched.includes(0)) return HARD_MAX
  if (matched.length) return Math.min(HARD_MAX, Math.max(...matched))
  const fallback = Number(
    config.getSafe('authentication.perms.personalShiny')?.defaultMax,
  )
  // unlike `limits`, a defaultMax of 0 means "none": users need a role with a limit
  return Number.isFinite(fallback) && fallback >= 0
    ? Math.min(HARD_MAX, fallback)
    : HARD_MAX
}

module.exports = { HARD_MAX, personalShinyLimits, getPersonalShinyMax }
