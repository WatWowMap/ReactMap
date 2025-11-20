// @ts-check
const config = require('@rm/config')

/**
 *
 * @param {string[]} roles
 * @param {'discordRoles' | 'telegramGroups' | 'local'} provider
 * @param {boolean} [trialActive]
 * @returns {string[]}
 */
function scannerPerms(roles, provider, trialActive = false) {
  const scanner = config.getSafe('scanner')

  const perms = []
  roles.forEach((role) => {
    Object.keys(scanner).forEach((mode) => {
      if (
        scanner[mode]?.enabled &&
        scanner[mode][provider] &&
        (scanner[mode][provider].includes(role) ||
          !scanner[mode][provider].length ||
          (trialActive && scanner[mode]?.trialPeriodEligible))
      ) {
        perms.push(mode)
      }
    })
  })
  return [...new Set(perms)]
}

/**
 * Determine which scanner modes should bypass the cooldown for a given role set.
 *
 * @param {string[]} roles
 * @param {'discordRoles' | 'telegramGroups' | 'local'} provider
 * @returns {string[]}
 */
function scannerCooldownBypass(roles, provider) {
  const scanner = config.getSafe('scanner')

  const bypass = []
  roles.forEach((role) => {
    Object.keys(scanner).forEach((mode) => {
      const bypassRoles = scanner[mode]?.cooldownBypass?.[provider]
      if (
        scanner[mode]?.enabled &&
        Array.isArray(bypassRoles) &&
        bypassRoles.includes(role)
      ) {
        bypass.push(mode)
      }
    })
  })
  return [...new Set(bypass)]
}

module.exports = { scannerPerms, scannerCooldownBypass }
