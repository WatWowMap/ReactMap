// server/src/auth/discord-perms.ts
import type { DiscordGuildResult } from './discord-roles'

/**
 * Pure: computes the permission set for one Discord account, given the
 * account's own id, per-guild membership+role results the bot client
 * looked up (or `'unknown'` where that could not be determined -- see
 * `discord-roles.js`), and the operator's configured rules.
 *
 * This is a fresh 2.0 implementation, written by reading (not calling)
 * 1.x's `DiscordClient#getPerms` (`server/src/services/DiscordClient.js`).
 * What is carried over exactly:
 *
 * - `allowedUsers` bypasses everything else, including `blockedGuilds` --
 *   1.x's `allowedUsers` branch returns before the blocked-guild loop ever
 *   runs, and `sign-in-gate.js`'s own tests already encode that precedence
 *   ("allowedUsers id skips the blockedGuilds check entirely"). Checking
 *   `allowedUsers` before `blockedGuilds` below keeps that identical.
 * - `permsConfig[key].roles` -- role-id matching within an `allowedGuilds`
 *   guild -- is back. 2.0 keeps a Discord bot (see `discord-bot-client.js`)
 *   specifically so per-guild roles are available again; membership alone
 *   only grants `alwaysEnabledPerms`, same as 1.x.
 *
 * What is still deliberately absent: the trial-period window
 * (`TrialManager`, `strategy.trialPeriod`). That is a live, stateful
 * subsystem (`server/src/services/Trial.js`) nothing in this task's brief
 * asked for. Every account permanently reports `trial: false`.
 *
 * @param user `guildResults` maps a guild id (every id in
 *   `rules.blockedGuilds` and `rules.allowedGuilds`, deduplicated) to what
 *   the bot found there. `null` means the bot itself was never queried at
 *   all (not configured) -- equivalent to every entry being `unknown`.
 */
function computeDiscordPerms(
  user: { id: string; guildResults: Record<string, DiscordGuildResult> | null },
  rules: {
    allowedUsers: string[]
    allowedGuilds: string[]
    blockedGuilds: string[]
    permsConfig: Record<string, { enabled: boolean; roles?: string[] }>
    alwaysEnabledPerms: string[]
  },
): Record<string, any> | null {
  const basePerms = (): Record<string, any> => {
    const perms: Record<string, any> = Object.fromEntries(
      Object.keys(rules.permsConfig).map((key) => [key, false]),
    )
    perms.admin = false
    perms.trial = false
    return perms
  }

  const isAllowedUser = rules.allowedUsers.includes(user.id)

  if (isAllowedUser) {
    // Needs no guild data at all -- honoured even when the bot could not
    // be reached this time.
    const perms = basePerms()
    Object.keys(rules.permsConfig).forEach((key) => {
      if (rules.permsConfig[key]?.enabled) perms[key] = true
    })
    perms.admin = true
    return perms
  }

  const relevantGuildIds = [
    ...new Set([...rules.blockedGuilds, ...rules.allowedGuilds]),
  ]
  const resultFor = (guildId: string) => user.guildResults?.[guildId] || null

  // Any guild this computation actually needs is unresolved: the bot is not
  // configured, could not reach that guild, or was rate limited. Rather than
  // decide blocked/allowed membership on incomplete information -- which
  // could wrongly clear a block or wrongly deny an allow -- skip writing a
  // row this time and leave whatever `user_perms` already has alone. This is
  // the same "unknown is not empty" rule `discord-guilds.js` used to encode
  // for OAuth guild membership, now applied to bot-fetched roles instead.
  const hasUnknown = relevantGuildIds.some((id) => {
    const result = resultFor(id)
    return !result || result.status === 'unknown'
  })
  if (hasUnknown) {
    return null
  }

  const perms = basePerms()

  const blockedHits = rules.blockedGuilds.filter(
    (id) => resultFor(id)?.status === 'member',
  )
  if (blockedHits.length) {
    perms.blocked = true
    perms.blockedGuildNames = blockedHits
      .map((id) => {
        const result = resultFor(id)
        return result?.status === 'member' ? result.guildName : undefined
      })
      .filter(Boolean)
  }

  rules.allowedGuilds.forEach((guildId) => {
    const result = resultFor(guildId)
    if (result?.status !== 'member') return
    const roles = result.roles
    Object.keys(rules.permsConfig).forEach((key) => {
      const info = rules.permsConfig[key]
      if (!info?.enabled) return
      if (rules.alwaysEnabledPerms.includes(key)) {
        perms[key] = true
      } else if (
        Array.isArray(info.roles) &&
        info.roles.some((roleId) => roles.includes(roleId))
      ) {
        perms[key] = true
      }
    })
  })

  return perms
}

export { computeDiscordPerms }
