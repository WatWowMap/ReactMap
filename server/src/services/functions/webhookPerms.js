const { webhooks } = require('../config')

module.exports = function webhookPerms(roles, provider, trialActive = false) {
  const perms = []
  roles.forEach((role) => {
    webhooks.forEach((webhook) => {
      if (
        webhook?.[provider]?.includes(role) ||
        (trialActive && webhook?.trialPeriodEligible)
      ) {
        perms.push(webhook.name)
      }
    })
  })
  return [...new Set(perms)]
}
