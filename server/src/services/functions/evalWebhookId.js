/** @param {InstanceType<typeof import('../../models/User')>} user */
function evalWebhookId(user) {
  if (!user) {
    return ''
  }
  const { strategy, webhookStrategy, discordId, telegramId } = user
  switch (strategy) {
    case 'discord':
      return discordId
    case 'telegram':
      return telegramId
    default:
      return webhookStrategy === 'discord' ? discordId : telegramId
  }
}

module.exports = evalWebhookId
