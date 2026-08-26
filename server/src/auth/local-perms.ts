// server/src/auth/local-perms.ts

import config from '@rm/config'

import { alertsPerm } from '../utils/alerts-perms'
import { areaPerms } from '../utils/area-perms'
import { scannerCooldownBypass, scannerPerms } from '../utils/scanner-perms'

/** The role identifier every credential (local, non-social) account carries. */
const LOCAL_ROLE = 'local'

/**
 * Pure: computes the permission set for a credential (email/password)
 * account. 1.x had `LocalClient#getPerms`, deleted with nothing to replace
 * it -- this is that replacement, read from git history
 * (`git show fa48d99c:server/src/services/LocalClient.js`) and written
 * fresh rather than restored, because that class also carried a passport
 * `authHandler` and direct `state.db.models.User` queries this task has no
 * reason to bring back.
 *
 * Two differences from what `LocalClient#getPerms` did:
 *
 * - 1.x accepted a per-user `status` (`'local'` by default, but overridable
 *   per account from a `data.status` JSON column on the old `users` table)
 *   and matched a perm's `roles` against `alwaysEnabledPerms`, `'local'`,
 *   *or* that status. 2.0's `auth_user` has no equivalent column (see
 *   `server/src/db/authSchema.js`), so there is no per-user status to
 *   check -- every credential account is treated as carrying exactly the
 *   `'local'` role. An operator who wants to grant a perm to credential
 *   accounts lists `'local'` in that perm's `roles`, same config shape as
 *   before, just without the second, unreachable-in-2.0 status match.
 * - The trial-period window is dropped, for the same reason and to the
 *   same effect as in `discord-perms.js`: it is a live, stateful subsystem
 *   nothing in this task's brief asked for.
 *
 */
function computeLocalPerms(rules: {
  permsConfig: Record<string, { enabled: boolean; roles: string[] }>
  alwaysEnabledPerms: string[]
}): Record<string, any> {
  const perms: Record<string, any> = Object.fromEntries(
    Object.entries(rules.permsConfig).map(([key, info]) => [
      key,
      Boolean(
        info.enabled &&
          (rules.alwaysEnabledPerms.includes(key) ||
            (info.roles || []).includes(LOCAL_ROLE)),
      ),
    ]),
  )
  perms.admin = false
  perms.trial = false
  // areaPerms reads config.areas, which is only populated once something
  // calls `config.setAreas` with the loaded area boundary files -- 2.0's
  // entry (server/src/serve.js) does not do this yet, so this currently
  // always falls through to the config.has guard below. Keeping the guard
  // rather than assuming `config.areas` exists is what keeps this function
  // callable -- and this file's own unit tests runnable -- either way, same
  // as `getFromConfigOverrideOrArea` in packages/config/lib/index.js does
  // for the same reason.
  perms.areaRestrictions = config.has('areas') ? areaPerms([LOCAL_ROLE]) : []
  perms.alerts = alertsPerm([LOCAL_ROLE], 'local')
  perms.scanner = scannerPerms([LOCAL_ROLE], 'local')
  perms.scannerCooldownBypass = scannerCooldownBypass([LOCAL_ROLE], 'local')
  return perms
}

export { computeLocalPerms, LOCAL_ROLE }
