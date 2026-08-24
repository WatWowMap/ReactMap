// server/src/auth/signInGate.js
// @ts-check
const { computeUserPermsRows } = require('./recomputePerms')

/**
 * Decides whether a sign-in may proceed, given the perms already computed
 * for each of the user's linked provider accounts (one entry per Discord or
 * Telegram account, in the same shape `DiscordClient#getPerms` and
 * `TelegramClient#getUserPerms` return).
 *
 * This is deliberately a consumer of that output, not a second
 * implementation of it. `DiscordClient#getPerms` already encodes Discord's
 * `blockedGuilds`/`allowedUsers` precedence: an `allowedUsers` id skips the
 * `blockedGuilds` check entirely and sets `perms.map = true`, so by the time
 * perms reach here a blocked-but-allowed user already has `blocked`
 * unset and `map` true. Re-deriving that precedence from raw guild ids and
 * config here would be a second, divergeable source of truth for the same
 * rule, and would also be wrong for Telegram: `TelegramClient` has no
 * `allowedUsers` bypass at all (an allow-listed Telegram user only gets
 * `admin: true`, not a free pass on `map`), so a shared "allowedUsers wins"
 * rule would misgate that provider.
 *
 * A user with no linked provider accounts (a local-only sign-in, with no
 * computed perms rows at all) is allowed: nothing here has an opinion on the
 * local strategy, that gate is Task 5's job (`localPassword`).
 *
 * @param {(Record<string, any> | null | undefined)[]} permsList
 * @returns {{ allow: true } | { allow: false, reason: string }}
 */
function evaluateSignInGate(permsList) {
  if (!permsList || permsList.length === 0) {
    return { allow: true }
  }
  if (permsList.some((perms) => perms?.blocked)) {
    return { allow: false, reason: 'blocked_guild' }
  }
  if (permsList.some((perms) => perms?.map)) {
    return { allow: true }
  }
  return { allow: false, reason: 'no_map_perms' }
}

/**
 * Loads a user's linked accounts, recomputes perms for each (same pure
 * function `recomputePermsOnSignIn` upserts from), and gates on the result.
 * Dependencies are injected so this is testable without a database or a
 * live Discord/Telegram client.
 *
 * @param {string} userId
 * @param {{
 *   getAccounts: (userId: string) => Promise<{ userId: string, providerId: string, accountId: string }[]>,
 *   computers: Record<string, (accountId: string, userId: string) => Promise<Record<string, any> | null | undefined>>,
 * }} deps
 */
async function checkSignInGate(userId, deps) {
  const accounts = await deps.getAccounts(userId)
  const rows = await computeUserPermsRows(accounts, deps.computers)
  return evaluateSignInGate(rows.map((row) => row.perms))
}

/**
 * Wires `checkSignInGate` to the real database and the live auth clients.
 * Required lazily so importing this module never opens a database
 * connection or reaches into `state` at load time, same as
 * `createRecomputeUserPerms` in `recomputePermsOnSignIn.js`.
 */
function createSignInGateCheck() {
  return async function checkGate(userId) {
    const { eq } = require('drizzle-orm')
    const { getDrizzle } = require('../db/drizzle')
    const { authAccount } = require('../db/authSchema')
    const { state } = require('../services/state')
    const { buildComputers } = require('./recomputePermsOnSignIn')

    const db = getDrizzle()
    return checkSignInGate(userId, {
      getAccounts: (id) =>
        db.select().from(authAccount).where(eq(authAccount.userId, id)),
      computers: buildComputers(state.event.authClients),
    })
  }
}

module.exports = { evaluateSignInGate, checkSignInGate, createSignInGateCheck }
