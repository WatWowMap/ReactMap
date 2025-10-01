// @ts-check
const config = require('@rm/config')

/**
 *
 * @param {string[]} identifiers Discord role IDs or user IDs
 * @param {string} provider
 * @param {boolean} [trialActive]
 * @returns {string[]}
 */
function webhookPerms(identifiers, provider, trialActive = false) {
  const perms = []
  identifiers.forEach((role) => {
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

module.exports = { webhookPerms }
