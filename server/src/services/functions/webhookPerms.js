const { webhooks } = require('../config')

module.exports = function webhookPerms(roles, provider) {
  const perms = []
  roles.forEach((role) => {
    webhooks.forEach((webhook) => {
      if (webhook?.[provider]?.includes(role)) {
        perms.push(webhook.name)
      }
    })
  })
  return [...new Set(perms)]
}
