const { scanner } = require('../config')

module.exports = function scannerPerms(roles, provider, trialActive = false) {
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
