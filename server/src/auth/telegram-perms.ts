// server/src/auth/telegram-perms.ts

import config from '@rm/config'

import { alertsPerm } from '../utils/alerts-perms'
import { areaPerms } from '../utils/area-perms'
import { scannerCooldownBypass, scannerPerms } from '../utils/scanner-perms'

/**
 * Pure: computes the permission set for a Telegram account, given the
 * group memberships `telegram-groups.js` fetched (the user's own id plus
 * every configured group they currently belong to) and the operator's
 * configured rules. Read from (not calling) 1.x's
 * `TelegramClient#getUserPerms`.
 *
 * Kept identical to 1.x: a perm's `roles` matched against `groups` (which,
 * per `telegram-groups.js`, includes the user's own id), `alwaysEnabledPerms`,
 * `allowedUsers` granting `admin` (and only `admin` -- Telegram never had
 * Discord's "allowedUsers skips everything" bypass, `signInGate.js`'s own
 * tests already rely on that difference), and area/webhook/scanner perms
 * derived from the same `groups` list via the shared, config-driven
 * `areaPerms`/`alertsPerm`/`scannerPerms` utilities (not the forbidden
 * `TelegramClient` class -- those utilities live in `server/src/utils/` and
 * take plain role arrays, nothing 1.x-shaped).
 *
 * Dropped, for the same reason as `discord-perms.js` and `local-perms.js`:
 * the trial-period window. Every account permanently reports `trial: false`.
 *
 */
function computeTelegramPerms(
  user: { id: string; groups: string[] },
  rules: {
    allowedUsers: string[]
    permsConfig: Record<string, { enabled: boolean; roles: string[] }>
    alwaysEnabledPerms: string[]
  },
): Record<string, any> {
  const perms: Record<string, any> = Object.fromEntries(
    Object.entries(rules.permsConfig).map(([key, info]) => [
      key,
      Boolean(
        info.enabled &&
          (rules.alwaysEnabledPerms.includes(key) ||
            (info.roles || []).some((role) => user.groups.includes(role))),
      ),
    ]),
  )
  perms.admin = rules.allowedUsers.includes(user.id)
  perms.trial = false
  // See local-perms.js's identical guard for why: config.areas is only set
  // once the server has actually booted and loaded area boundaries.
  perms.areaRestrictions = config.has('areas') ? areaPerms(user.groups) : []
  perms.alerts = alertsPerm(user.groups, 'telegramGroups')
  perms.scanner = scannerPerms(user.groups, 'telegramGroups')
  perms.scannerCooldownBypass = scannerCooldownBypass(
    user.groups,
    'telegramGroups',
  )
  return perms
}

export { computeTelegramPerms }
