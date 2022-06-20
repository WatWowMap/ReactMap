const { webhooks } = require('../config')

module.exports = function webhookPerms(roles, provider) {
  let perms = []
  if (webhooks.length) {
    roles.forEach((role) => {
      webhooks.forEach((webhook) => {
        if (webhook?.[provider]?.includes(role)) {
          perms.push(webhook.name)
        }
      })
    })
  }
  if (perms.length) {
    perms = [...new Set(perms)]
  }
  return perms
}
