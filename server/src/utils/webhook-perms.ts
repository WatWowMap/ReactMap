import config from '@rm/config'

function webhookPerms(
  roles: string[],
  provider: string,
  trialActive = false,
): string[] {
  const perms: string[] = []
  roles.forEach((role) => {
    config.getSafe('webhooks').forEach((webhook: any) => {
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

export { webhookPerms }
