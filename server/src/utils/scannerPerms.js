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

module.exports = { scannerPerms }
