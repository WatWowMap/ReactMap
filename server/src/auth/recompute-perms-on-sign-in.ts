// server/src/auth/recomputePermsOnSignIn.ts

import config from '@rm/config'
import { log, TAGS } from '@rm/logger'
import { eq } from 'drizzle-orm'

import { authAccount, userPerms } from '../db/auth-schema'
import { getDrizzle } from '../db/drizzle'
import { getSharedDiscordClient } from './discord-bot-client'
import { computeDiscordPerms } from './discord-perms'
import { fetchDiscordGuildResults } from './discord-roles'
import { computeLocalPerms } from './local-perms'
import { computeUserPermsRows } from './recompute-perms'
import { fetchTelegramGroups } from './telegram-groups'
import { computeTelegramPerms } from './telegram-perms'

/**
 * Loads a user's linked accounts, recomputes perms for each, and upserts the
 * result. Dependencies are injected so the wiring can be tested without a
 * database, a Discord bot connection, or the Telegram API.
 *
 */
async function recomputeUserPerms(
  userId: string,
  deps: {
    getAccounts: (
      userId: string,
    ) => Promise<{ userId: string; providerId: string; accountId: string }[]>
    computers: Record<
      string,
      (
        accountId: string,
        userId: string,
      ) => Promise<Record<string, any> | null | undefined>
    >
    upsert: (
      rows: {
        id: string
        userId: string
        providerId: string
        perms: Record<string, any>
      }[],
    ) => Promise<void>
  },
) {
  const accounts = await deps.getAccounts(userId)
  const rows = await computeUserPermsRows(accounts, deps.computers)
  await deps.upsert(rows)
}

/**
 * Builds the provider -> compute function map `computeUserPermsRows` calls
 * through. Each entry is a thin adapter: fetch whatever this provider
 * needs (Discord's bot gateway, a Telegram Bot API response) and hand it
 * to the matching pure permission function (`discord-perms.js`,
 * `telegram-perms.js`). Only registered for a strategy that is actually
 * enabled in config, mirroring which providers 1.x's `authClients`
 * registry populated -- except that registry held live
 * `DiscordClient`/`TelegramClient` instances
 * (`server/src/services/DiscordClient.js`, `TelegramClient.js`), which this
 * branch may not import, call, or adapt. This is the fresh 2.0 replacement:
 * Discord's computer reads the process-wide bot connection
 * (`discord-bot-client.js`), Telegram's still reaches the Bot API over
 * plain `fetch` -- no 1.x class, of either kind.
 *
 * The credential (local/email-password) provider is deliberately NOT
 * registered here -- see `createRecomputeUserPerms` below for where it is
 * added instead, and why.
 *
 */
function buildComputers(deps: {
  strategies: any[]
  getDiscordClient?: () => import('discord.js').Client | null
  fetchDiscordGuildResultsImpl?: typeof fetchDiscordGuildResults
  fetchTelegramGroupsImpl?: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>
}) {
  const permsConfig = config.getSafe('authentication.perms')
  const alwaysEnabledPerms = config.getSafe('authentication.alwaysEnabledPerms')

  const discordStrategy = deps.strategies.find(
    (s) => s.type === 'discord' && s.enabled,
  )
  const telegramStrategy = deps.strategies.find(
    (s) => s.type === 'telegram' && s.enabled,
  )

  const computers: Record<
    string,
    (accountId: string, userId?: string) => Promise<Record<string, any> | null>
  > = {}

  if (discordStrategy) {
    const relevantGuildIds = [
      ...(discordStrategy.blockedGuilds || []),
      ...(discordStrategy.allowedGuilds || []),
    ]
    const fetchGuildResults =
      deps.fetchDiscordGuildResultsImpl || fetchDiscordGuildResults
    computers.discord = async (accountId: string) => {
      const client = deps.getDiscordClient
        ? deps.getDiscordClient()
        : getSharedDiscordClient()
      const guildResults = await fetchGuildResults(
        client,
        relevantGuildIds,
        accountId,
      )
      return computeDiscordPerms(
        { id: accountId, guildResults },
        {
          allowedUsers: discordStrategy.allowedUsers || [],
          allowedGuilds: discordStrategy.allowedGuilds || [],
          blockedGuilds: discordStrategy.blockedGuilds || [],
          permsConfig,
          alwaysEnabledPerms,
        },
      )
    }
  }

  if (telegramStrategy) {
    computers.telegram = async (accountId: string) => {
      const groups = await fetchTelegramGroups(
        telegramStrategy.botToken,
        telegramStrategy.groups || [],
        accountId,
        deps.fetchTelegramGroupsImpl,
      )
      return computeTelegramPerms(
        { id: accountId, groups },
        {
          allowedUsers: telegramStrategy.allowedUsers || [],
          permsConfig,
          alwaysEnabledPerms,
        },
      )
    }
  }

  return computers
}

/**
 * Wires `recomputeUserPerms` to the real database. Required lazily so
 * importing this module never opens a database connection or reaches into
 * config at load time.
 */
function createRecomputeUserPerms() {
  return async function recompute(userId: string) {
    const db = getDrizzle()

    try {
      await recomputeUserPerms(userId, {
        getAccounts: (id: string) =>
          db.select().from(authAccount).where(eq(authAccount.userId, id)),
        computers: {
          ...buildComputers({
            strategies: config.getSafe('authentication.strategies'),
          }),
          // Registered here, not in buildComputers, and only for recompute
          // -- not for the sign-in gate (server/src/auth/sign-in-gate.js
          // builds its own computers without this entry). A local/credential
          // sign-in has never been gated on perms.map the way Discord and
          // Telegram are: 1.x's local passport strategy called `done(null,
          // user)` unconditionally, with no `perms.map === false` check at
          // all (contrast server/src/services/DiscordClient.js and
          // TelegramClient.js, which both refuse the sign-in outright).
          // signInGate.js's own comment already documents this exemption
          // ("nothing here has an opinion on the local strategy"). Feeding a
          // credential row into computeUserPermsRows for the *gate* would
          // silently end that exemption -- a fresh install's default config
          // grants no perm to any role, so every local sign-in would newly
          // fail the "at least one row has perms.map" check the moment
          // credential perms exist at all. That gate behaviour is explicitly
          // out of this task's scope, so the computer that would change it
          // is kept out of the gate's computers and only feeds the write
          // path, which is what the "credential users get none at all"
          // defect this task closes is actually about.
          credential: async () =>
            computeLocalPerms({
              permsConfig: config.getSafe('authentication.perms'),
              alwaysEnabledPerms: config.getSafe(
                'authentication.alwaysEnabledPerms',
              ),
            }),
        },
        upsert: async (rows: any[]) => {
          for (const row of rows) {
            await db
              .insert(userPerms)
              .values(row)
              .onDuplicateKeyUpdate({ set: { perms: row.perms } })
          }
        },
      })
    } catch (e) {
      // A recompute failure must not take the sign-in down: the session is
      // already created by the time this hook runs, so the worst case here
      // is stale/empty perms, not a broken login.
      log.warn(TAGS.auth, 'perms recompute failed for', userId, e)
    }
  }
}

export { buildComputers, createRecomputeUserPerms, recomputeUserPerms }
