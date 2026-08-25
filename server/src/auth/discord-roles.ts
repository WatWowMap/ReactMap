// server/src/auth/discord-roles.ts

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
 */
export type DiscordGuildResult =
  | { status: 'member'; roles: string[]; guildName?: string }
  | { status: 'not_member' }
  | { status: 'unknown'; reason: string }

interface DiscordClientLike {
  guilds: {
    cache: { get: (id: string) => any }
    fetch: (id: string) => Promise<any>
  }
}

async function fetchGuildMemberRoles(
  client: DiscordClientLike | null,
  guildId: string,
  userId: string,
): Promise<DiscordGuildResult> {
  if (!client) {
    return { status: 'unknown', reason: 'bot_not_configured' }
  }

  let guild: any
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
      roles: member.roles.cache.map((role: any) => role.id),
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
 */
async function fetchDiscordGuildResults(
  client: DiscordClientLike | null,
  guildIds: string[],
  userId: string,
): Promise<Record<string, DiscordGuildResult>> {
  const uniqueIds = [...new Set(guildIds)]
  const results: Record<string, DiscordGuildResult> = {}
  await Promise.all(
    uniqueIds.map(async (guildId) => {
      results[guildId] = await fetchGuildMemberRoles(client, guildId, userId)
    }),
  )
  return results
}

export { fetchDiscordGuildResults, fetchGuildMemberRoles }
