// server/src/auth/recomputePermsOnSignIn.js
// @ts-check
const { computeUserPermsRows } = require('./recomputePerms')

/**
 * Loads a user's linked accounts, recomputes perms for each, and upserts the
 * result. Dependencies are injected so the wiring can be tested without a
 * database, a Discord bot connection, or the Telegram API.
 *
 * @param {string} userId
 * @param {{
 *   getAccounts: (userId: string) => Promise<{ userId: string, providerId: string, accountId: string }[]>,
 *   computers: Record<string, (accountId: string, userId: string) => Promise<Record<string, any> | null | undefined>>,
 *   upsert: (rows: { id: string, userId: string, providerId: string, perms: Record<string, any> }[]) => Promise<void>,
 * }} deps
 */
async function recomputeUserPerms(userId, deps) {
  const accounts = await deps.getAccounts(userId)
  const rows = await computeUserPermsRows(accounts, deps.computers)
  await deps.upsert(rows)
}

/**
 * Picks the live Discord/Telegram bot clients out of the auth client
 * registry and adapts them into the `computers` shape `recomputeUserPerms`
 * expects. `DiscordClient#getPerms` and `TelegramClient#getUserPerms` were
 * both written for passport's verify callback, so this is where that
 * mismatch gets absorbed rather than in the pure recompute logic.
 *
 * `DiscordClient#getPerms` computes guild/role-based perms from
 * `user.guilds`, a list Discord only returns to an OAuth token carrying the
 * `guilds` scope. Better Auth is not requesting that scope yet (see Task 4 of
 * this plan), so `guilds` is passed as `[]` here: every guild-and-role-based
 * perm resolves to its default until that scope lands, but the
 * `allowedUsers` admin override still works, since it only needs the
 * Discord user id.
 *
 * @param {Record<string, any>} authClients
 */
function buildComputers(authClients) {
  const clients = Object.values(authClients || {})
  const discordClient = clients.find((c) => c?.strategy?.type === 'discord')
  const telegramClient = clients.find((c) => c?.strategy?.type === 'telegram')

  /** @type {Record<string, (accountId: string) => Promise<Record<string, any>>>} */
  const computers = {}
  if (discordClient) {
    computers.discord = (accountId) =>
      discordClient.getPerms({ id: accountId, guilds: [] })
  }
  if (telegramClient) {
    computers.telegram = async (accountId) => {
      const groups = await telegramClient.getUserGroups({ id: accountId })
      return telegramClient.getUserPerms({ id: accountId }, groups).perms
    }
  }
  return computers
}

/**
 * Wires `recomputeUserPerms` to the real database and the live auth
 * clients. Required lazily so importing this module never opens a database
 * connection or reaches into `state` at load time.
 */
function createRecomputeUserPerms() {
  return async function recompute(userId) {
    const { eq } = require('drizzle-orm')
    const { log, TAGS } = require('@rm/logger')
    const { getDrizzle } = require('../db/drizzle')
    const { authAccount, userPerms } = require('../db/authSchema')
    const { state } = require('../services/state')

    const db = getDrizzle()
    try {
      await recomputeUserPerms(userId, {
        getAccounts: (id) =>
          db.select().from(authAccount).where(eq(authAccount.userId, id)),
        computers: buildComputers(state.event.authClients),
        upsert: async (rows) => {
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

module.exports = {
  recomputeUserPerms,
  buildComputers,
  createRecomputeUserPerms,
}
