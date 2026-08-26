import config from '@rm/config'
import type { Poracle } from '@rm/types'

type AlertsProvider = 'discordRoles' | 'telegramGroups' | 'local'

/**
 * Whether any of these roles grants access to Alerts.
 *
 * A boolean rather than 1.x's list of instance names: there is one Poracle
 * instance, so the only question is whether this account may use it. The
 * optional chaining is load-bearing -- a config that omits a provider's role
 * list must deny, not throw during boot.
 */
function alertsPerm(
  roles: string[],
  provider: AlertsProvider,
  // Injected by tests. `mock.module` is process-wide in bun, so mocking
  // `@rm/config` here would steal the real config from every suite that runs
  // after this one -- the same widening `poracleConfigured` already has.
  deps: { config?: Partial<Poracle> } = {},
): boolean {
  const poracle: any = deps.config ?? config.getSafe('poracle')
  if (!poracle?.enabled) return false
  const allowed: string[] | undefined = poracle?.[provider]
  if (!allowed?.length) return false
  return roles.some((role) => allowed.includes(role))
}

export type { AlertsProvider }
export { alertsPerm }
