// server/src/auth/discord-bot-client.ts

import { log, TAGS } from '@rm/logger'
import { Client, GatewayIntentBits } from 'discord.js'

import { createRecomputeUserPerms } from './recompute-perms-on-sign-in'
import { createRevocationDeps } from './revoke-access-adapter'

/**
 * Fresh 2.0 gateway client, written by reading (not calling) 1.x's
 * `DiscordClient` (`server/src/services/DiscordClient.js` lines 20-107):
 * same `new Client(...)` + `client.login(botToken)`, same
 * `guildMemberUpdate` before/after role diff driving a recompute, read for
 * the shape and rewritten fresh -- no import of that file.
 *
 * One process-wide gateway connection, matching the one bot identity
 * `config/default.json` configures. `startDiscordBot` is fire-and-forget:
 * it never awaits the login round-trip, so a Discord outage or a missing
 * bot token at boot cannot delay `Bun.serve` or block a local sign-in.
 * While disconnected or never started, `getSharedDiscordClient` returns
 * `null` and every guild/role lookup in `discord-roles.js` treats that as
 * `unknown` -- skipped, not zeroed. There is no reconnect/retry loop here;
 * a login failure is logged once and the bot stays absent until the
 * process restarts, same as the OAuth-token failure modes it replaces
 * (both leave guild-derived perms un-refreshed rather than crash anything).
 */

let sharedClient: Client | null = null

/**
 * The shared bot connection, or `null` if it was never started or has not
 * finished logging in yet. Never throws.
 */
function getSharedDiscordClient(): Client | null {
  return sharedClient?.isReady() ? sharedClient : null
}

/**
 * Starts the bot's gateway connection, if a `botToken` is given, and wires
 * the `guildMemberUpdate` listener that drives a permission recompute off
 * Discord's own push signal -- precise, and far better than polling for
 * catching a role that was just added or removed. Safe to call at most
 * once per process; later calls are a no-op and return whatever the first
 * call produced.
 *
 */
function startDiscordBot({
  botToken,
  onRoleChange,
}: {
  botToken: string | undefined | null
  onRoleChange?: (discordUserId: string) => Promise<void>
}): Client | null {
  if (!botToken) {
    log.info(
      TAGS.auth,
      'Discord bot token not configured; guild/role permissions are skipped, not denied.',
    )
    return null
  }
  if (sharedClient) return sharedClient

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  })

  client.on('clientReady', (c) => {
    log.info(TAGS.auth, `Discord bot connected as ${c.user?.tag || 'unknown'}`)
  })

  client.on('error', (e) => {
    log.warn(TAGS.auth, 'Discord bot connection error', e)
  })

  if (onRoleChange) {
    client.on('guildMemberUpdate', async (prev, next) => {
      const rolesBefore = prev.roles.cache.map((role) => role.id)
      const rolesAfter = next.roles.cache.map((role) => role.id)
      const changed = rolesBefore
        .filter((id) => !rolesAfter.includes(id))
        .concat(rolesAfter.filter((id) => !rolesBefore.includes(id)))
      if (!changed.length) return
      try {
        await onRoleChange(next.id)
      } catch (e) {
        log.warn(TAGS.auth, 'role-change recompute failed for', next.id, e)
      }
    })
  }

  client.login(botToken).catch((e) => {
    log.warn(TAGS.auth, 'Discord bot failed to log in', e)
  })

  sharedClient = client
  return sharedClient
}

/**
 * Builds the `onRoleChange` callback that wires the gateway's
 * `guildMemberUpdate` listener to a real recompute: resolve the Discord
 * snowflake back to the Better Auth user id it is linked to
 * (`revoke-access-adapter.js`'s `lookupUserId`, the same lookup 1.x's
 * revoke/recompute call sites used), then run the same recompute a sign-in
 * triggers. Required lazily so importing `discord-bot-client.js` never
 * opens a database connection at module load, same pattern as
 * `createRecomputeUserPerms`/`createSignInGateCheck`.
 *
 */
function createOnRoleChange(): (discordUserId: string) => Promise<void> {
  return async function onRoleChange(discordUserId: string) {
    const { lookupUserId } = createRevocationDeps()
    const userId = await lookupUserId('discord', discordUserId)
    if (!userId) return
    await createRecomputeUserPerms()(userId)
  }
}

export { createOnRoleChange, getSharedDiscordClient, startDiscordBot }
