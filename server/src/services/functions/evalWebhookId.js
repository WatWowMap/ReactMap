module.exports = function evalWebhookId(user) {
  if (!user) {
    return ''
  }
  const { strategy, webhookStrategy, discordId, telegramId } = user
  switch (strategy) {
    case 'discord': return discordId
    case 'telegram': return telegramId
    default: return webhookStrategy === 'discord' ? discordId : telegramId
  }
}
