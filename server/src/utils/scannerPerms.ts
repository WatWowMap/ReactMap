import config from '@rm/config'

function scannerPerms(
  roles: string[],
  provider: 'discordRoles' | 'telegramGroups' | 'local',
  trialActive = false,
): string[] {
  const scanner: any = config.getSafe('scanner')

  const perms: string[] = []
  roles.forEach((role) => {
    Object.keys(scanner).forEach((mode) => {
      if (
        scanner[mode]?.enabled &&
        scanner[mode][provider] &&
        (scanner[mode][provider].includes(role) ||
          !scanner[mode][provider].length ||
          (trialActive && scanner[mode]?.trialPeriodEligible))
      ) {
        perms.push(mode)
      }
    })
  })
  return [...new Set(perms)]
}

/**
 * Determine which scanner modes should bypass the cooldown for a given role set.
 *
 */
function scannerCooldownBypass(
  roles: string[],
  provider: 'discordRoles' | 'telegramGroups' | 'local',
): string[] {
  const scanner: any = config.getSafe('scanner')

  const bypass: string[] = []
  roles.forEach((role) => {
    Object.keys(scanner).forEach((mode) => {
      const bypassRoles = scanner[mode]?.cooldownBypass?.[provider]
      if (
        scanner[mode]?.enabled &&
        Array.isArray(bypassRoles) &&
        bypassRoles.includes(role)
      ) {
        bypass.push(mode)
      }
    })
  })
  return [...new Set(bypass)]
}

export { scannerCooldownBypass, scannerPerms }
