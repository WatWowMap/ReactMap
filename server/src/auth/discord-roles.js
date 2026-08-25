// server/src/auth/discord-roles.js
// @ts-check

/**
 * Looks up one guild's membership and roles for one Discord user, through
 * the bot client rather than the user's own OAuth token. Written by reading
 * (not calling) 1.x's `DiscordClient#getUserRoles`
 * (`server/src/services/DiscordClient.js` lines 99-131): same two calls
 * (`client.guilds.fetch(guildId)` then `guild.members.fetch(userId)`), same
 * "Unknown Member" (`code === 10007`) meaning "not a member", read fresh
 * rather than imported.
 *
 * `client` is injectable -- a real `discord.js` `Client`, or a fake object
 * shaped like one -- so callers and tests can drive every failure mode
 * (bot not configured, a guild fetch throwing, rate limiting, a member not
 * found) without a real Discord connection.
 *
 * @param {{ guilds: { cache: { get: (id: string) => any }, fetch: (id: string) => Promise<any> } } | null} client
 * @param {string} guildId
 * @param {string} userId
 * @returns {Promise<
 *   | { status: 'member', roles: string[], guildName?: string }
 *   | { status: 'not_member' }
 *   | { status: 'unknown', reason: string }
 * >}
 */
async function fetchGuildMemberRoles(client, guildId, userId) {
  if (!client) {
    return { status: 'unknown', reason: 'bot_not_configured' }
  }

  let guild
  try {
    guild =
      client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId))
  } catch (_e) {
    return { status: 'unknown', reason: 'guild_unreachable' }
  }
  if (!guild) {
    return { status: 'unknown', reason: 'guild_unreachable' }
  }

  try {
    const member = await guild.members.fetch(userId)
    return {
      status: 'member',
      roles: member.roles.cache.map((role) => role.id),
      guildName: guild.name,
    }
  } catch (e) {
    const code =
      e && typeof e === 'object' && 'code' in e ? Number(e.code) : null
    if (code === 10007) {
      // Discord's "Unknown Member" -- confidently not a member of this
      // guild, not an error.
      return { status: 'not_member' }
    }
    const status =
      e && typeof e === 'object' && 'status' in e ? Number(e.status) : null
    if (code === 429 || status === 429) {
      return { status: 'unknown', reason: 'rate_limited' }
    }
    return { status: 'unknown', reason: 'fetch_failed' }
  }
}

/**
 * Fetches membership + roles for one Discord user across every guild id in
 * `guildIds`, deduplicated. Powers `discord-perms.js`'s
 * `computeDiscordPerms`, which needs a result for every
 * `blockedGuilds`/`allowedGuilds` entry to evaluate them.
 *
 * @param {Parameters<typeof fetchGuildMemberRoles>[0]} client
 * @param {string[]} guildIds
 * @param {string} userId
 * @returns {Promise<Record<string, Awaited<ReturnType<typeof fetchGuildMemberRoles>>>>}
 */
async function fetchDiscordGuildResults(client, guildIds, userId) {
  const uniqueIds = [...new Set(guildIds)]
  /** @type {Record<string, Awaited<ReturnType<typeof fetchGuildMemberRoles>>>} */
  const results = {}
  await Promise.all(
    uniqueIds.map(async (guildId) => {
      results[guildId] = await fetchGuildMemberRoles(client, guildId, userId)
    }),
  )
  return results
}

module.exports = { fetchGuildMemberRoles, fetchDiscordGuildResults }
