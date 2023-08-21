// @ts-check
const config = require('@rm/config')

/**
 *
 * @param {string[]} roles
 * @param {string} provider
 * @param {boolean} [trialActive]
 * @returns {string[]}
 */
function webhookPerms(roles, provider, trialActive = false) {
  const perms = []
  roles.forEach((role) => {
    config.getSafe('webhooks').forEach((webhook) => {
      if (
        webhook.enabled &&
        (webhook?.[provider]?.includes(role) ||
          (trialActive && webhook?.trialPeriodEligible))
      ) {
        perms.push(webhook.name)
      }
    })
  })
  return [...new Set(perms)]
}

module.exports = webhookPerms
