// server/src/auth/discord-perms.js
// @ts-check

/**
 * Pure: computes the permission set for one Discord account, given the
 * account's own id, the guilds Discord says it belongs to (or `null` if
 * that could not be determined -- see `discord-guilds.js`), and the
 * operator's configured rules.
 *
 * This is a fresh 2.0 implementation, written by reading (not calling)
 * 1.x's `DiscordClient#getPerms`. Two things it deliberately does not
 * carry over:
 *
 * - Per-guild role membership. 1.x fetched a user's roles inside a guild
 *   through a live discord.js bot client sitting in that guild
 *   (`DiscordClient#getUserRoles`). 2.0 has no bot; the only thing it can
 *   ask Discord for, using the OAuth token Better Auth already stores, is
 *   which guilds the user belongs to (`GET /users/@me/guilds`), not their
 *   roles inside any of them. So `permsConfig[key].roles` -- role-id
 *   matching -- has no equivalent here. Membership in an `allowedGuilds`
 *   guild instead grants every perm listed in `alwaysEnabledPerms`, which
 *   is the one part of the role system that was never actually
 *   role-shaped to begin with.
 * - The trial-period window (`TrialManager`, `strategy.trialPeriod`). That
 *   is a live, stateful subsystem (`server/src/services/Trial.js`) with
 *   its own start/end/force-active state that nothing in this task's brief
 *   asked for. Every account permanently reports `trial: false`.
 *
 * What *is* carried over exactly: `allowedUsers` bypasses everything else,
 * including `blockedGuilds` -- 1.x's `allowedUsers` branch returns before
 * the blocked-guild loop ever runs, and `signInGate.js`'s own tests already
 * encode that precedence ("allowedUsers id skips the blockedGuilds check
 * entirely"). Checking `allowedUsers` before `blockedGuilds` below keeps
 * that identical rather than "fixing" it into something the gate does not
 * expect.
 *
 * @param {{ id: string, guilds: { id: string, name?: string }[] | null }} user
 * @param {{
 *   allowedUsers: string[],
 *   allowedGuilds: string[],
 *   blockedGuilds: string[],
 *   permsConfig: Record<string, { enabled: boolean }>,
 *   alwaysEnabledPerms: string[],
 * }} rules
 * @returns {Record<string, any> | null}
 */
function computeDiscordPerms(user, rules) {
  const basePerms = () => {
    const perms = Object.fromEntries(
      Object.keys(rules.permsConfig).map((key) => [key, false]),
    )
    perms.admin = false
    perms.trial = false
    return perms
  }

  const isAllowedUser = rules.allowedUsers.includes(user.id)

  if (user.guilds === null) {
    // Guild membership could not be determined this time (no token, an
    // expired one, Discord unreachable, or rate limited -- see
    // discord-guilds.js for which). An allowedUsers id does not need guild
    // data at all, so it is still honoured; anything short of that returns
    // null rather than a perms object, telling the caller (recomputeUserPerms
    // via computeUserPermsRows) to skip writing a row this time rather than
    // overwrite a real, previously-computed permission set with an
    // all-false one just because Discord happened to be unreachable on
    // this particular sign-in.
    if (isAllowedUser) {
      const perms = basePerms()
      Object.keys(rules.permsConfig).forEach((key) => {
        if (rules.permsConfig[key].enabled) perms[key] = true
      })
      perms.admin = true
      return perms
    }
    return null
  }

  if (isAllowedUser) {
    const perms = basePerms()
    Object.keys(rules.permsConfig).forEach((key) => {
      if (rules.permsConfig[key].enabled) perms[key] = true
    })
    perms.admin = true
    return perms
  }

  const perms = basePerms()
  const guildIds = user.guilds.map((guild) => guild.id)

  const blockedHits = rules.blockedGuilds.filter((id) => guildIds.includes(id))
  if (blockedHits.length) {
    perms.blocked = true
    perms.blockedGuildNames = blockedHits
      .map((id) => user.guilds?.find((guild) => guild.id === id)?.name)
      .filter(Boolean)
  }

  const isAllowedGuildMember = rules.allowedGuilds.some((id) =>
    guildIds.includes(id),
  )
  if (isAllowedGuildMember) {
    Object.keys(rules.permsConfig).forEach((key) => {
      if (
        rules.permsConfig[key].enabled &&
        rules.alwaysEnabledPerms.includes(key)
      ) {
        perms[key] = true
      }
    })
  }

  return perms
}

module.exports = { computeDiscordPerms }
