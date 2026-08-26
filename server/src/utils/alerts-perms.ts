import config from '@rm/config'

type AlertsProvider = 'discordRoles' | 'telegramGroups' | 'local'

/**
 * Whether any of these roles grants access to Alerts.
 *
 * A boolean rather than 1.x's list of instance names: there is one Poracle
 * instance, so the only question is whether this account may use it. The
 * optional chaining is load-bearing -- a config that omits a provider's role
 * list must deny, not throw during boot.
 */
function alertsPerm(roles: string[], provider: AlertsProvider): boolean {
  const poracle: any = config.getSafe('poracle')
  if (!poracle?.enabled) return false
  const allowed: string[] | undefined = poracle?.[provider]
  if (!allowed?.length) return false
  return roles.some((role) => allowed.includes(role))
}

export type { AlertsProvider }
export { alertsPerm }
