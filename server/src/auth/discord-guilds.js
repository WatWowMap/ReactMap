// server/src/auth/discord-guilds.js
// @ts-check

const DISCORD_GUILDS_URL = 'https://discord.com/api/users/@me/guilds'

/**
 * Fetches the guilds a Discord account belongs to, using the OAuth access
 * token Better Auth stores on its `auth_account` row (requires the `guilds`
 * scope, requested in `server/src/auth/index.js`). This is the piece the
 * defect this task fixes was missing entirely: nothing ever called this
 * endpoint, so `blockedGuilds`/`allowedGuilds` had no guild list to
 * evaluate and every guild-derived perm resolved to its default.
 *
 * Every failure mode returns `{ guilds: null, reason }` rather than
 * throwing or returning `[]`. `computeDiscordPerms` treats `null`
 * differently from `[]`: `null` means "could not determine membership this
 * time" and is skipped rather than written as an all-false permission set;
 * `[]` would be a real, confident "this account belongs to no guilds" and
 * *should* zero out guild-derived perms. Collapsing "unknown" into "empty"
 * is exactly the shape of bug this task exists to remove, so the two are
 * kept distinct all the way through.
 *
 * @param {string | null | undefined} accessToken
 * @param {typeof fetch} [fetchImpl] Injected so tests can simulate every
 *   failure mode without a network call or real Discord credentials.
 * @returns {Promise<{ guilds: { id: string, name?: string }[] | null, reason?: string }>}
 */
async function fetchDiscordGuilds(accessToken, fetchImpl = fetch) {
  // No token at all: never linked a working Discord OAuth grant, or the
  // account row predates the `guilds` scope. Nothing to fetch.
  if (!accessToken) {
    return { guilds: null, reason: 'no_token' }
  }

  let response
  try {
    response = await fetchImpl(DISCORD_GUILDS_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (_e) {
    // Discord unreachable (DNS, timeout, connection refused, ...). A
    // Discord outage must not become a total login outage -- the caller
    // treats this the same as "unknown", not "no perms", so an existing
    // permission set is left alone rather than erased.
    return { guilds: null, reason: 'unreachable' }
  }

  if (response.status === 401) {
    // Expired or revoked token. Better Auth does not refresh Discord
    // access tokens for this flow, so this is expected to happen and is
    // not itself an error worth logging loudly -- the account just has to
    // sign in again to refresh it.
    return { guilds: null, reason: 'unauthorized' }
  }

  if (response.status === 429) {
    return { guilds: null, reason: 'rate_limited' }
  }

  if (!response.ok) {
    return { guilds: null, reason: `http_${response.status}` }
  }

  try {
    const body = await response.json()
    if (!Array.isArray(body)) {
      return { guilds: null, reason: 'invalid_response' }
    }
    return {
      guilds: body.map((guild) => ({ id: guild.id, name: guild.name })),
    }
  } catch (_e) {
    return { guilds: null, reason: 'invalid_response' }
  }
}

module.exports = { fetchDiscordGuilds, DISCORD_GUILDS_URL }
