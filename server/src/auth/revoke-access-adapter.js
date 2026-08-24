// server/src/auth/revokeAccessAdapter.js
// @ts-check
const {
  planProviderRevocation,
  selectUserIdsByPermsFlag,
} = require('./revoke-access')

/**
 * Removes a user's `user_perms` row for one provider and revokes every
 * session they hold. Correct for a Discord guild removal and a trial's
 * expiry: in both cases the access is simply gone, so there is nothing left
 * to recompute -- unlike a role change, where the user may have gained
 * perms as well as lost them.
 *
 * @param {string} userId
 * @param {string} providerId
 * @param {{
 *   getUserPerms: (userId: string) => Promise<{ id: string, userId: string, providerId: string }[]>,
 *   deleteUserPermsRows: (ids: string[]) => Promise<void>,
 *   revokeSessions: (userId: string) => Promise<void>,
 * }} deps
 */
async function revokeProviderAccess(userId, providerId, deps) {
  const rows = await deps.getUserPerms(userId)
  const { removed } = planProviderRevocation(rows, userId, providerId)
  if (removed.length) {
    await deps.deleteUserPermsRows(removed.map((row) => row.id))
  }
  await deps.revokeSessions(userId)
}

/**
 * Finds every user whose `user_perms` row for `providerId` has
 * `perms[flagKey] === flagValue`, and applies `apply` to each. Backs both
 * Trial call sites, which act on a set of users found by a flag rather than
 * a single user handed to them by a Discord event.
 *
 * @param {string} providerId
 * @param {string} flagKey
 * @param {any} flagValue
 * @param {{
 *   getUserPermsForProvider: (providerId: string) => Promise<{ userId: string, providerId: string, perms: Record<string, any> }[]>,
 *   apply: (userId: string) => Promise<void>,
 * }} deps
 */
async function applyToUsersWithPermsFlag(providerId, flagKey, flagValue, deps) {
  const rows = await deps.getUserPermsForProvider(providerId)
  const userIds = selectUserIdsByPermsFlag(rows, providerId, flagKey, flagValue)
  for (const userId of userIds) {
    // eslint-disable-next-line no-await-in-loop
    await deps.apply(userId)
  }
  return userIds
}

/**
 * Wires the two adapters above to the real database. Required lazily so
 * importing this module never opens a connection.
 *
 * `lookupUserId` resolves the `auth_account` link (provider + external
 * account id) back to the Better Auth `userId` it belongs to. Discord and
 * Telegram events only ever hand back the provider's own id, so callers
 * need this before they can touch `user_perms` or `auth_session`.
 */
function createRevocationDeps() {
  const { eq, inArray, and } = require('drizzle-orm')
  const { getDrizzle } = require('../db/drizzle')
  const { userPerms, authAccount, authSession } = require('../db/auth-schema')

  const db = () => getDrizzle()

  const lookupUserId = async (providerId, accountId) => {
    const rows = await db()
      .select({ userId: authAccount.userId })
      .from(authAccount)
      .where(
        and(
          eq(authAccount.providerId, providerId),
          eq(authAccount.accountId, accountId),
        ),
      )
    return rows[0]?.userId || null
  }

  const revokeAccess = {
    getUserPerms: (userId) =>
      db().select().from(userPerms).where(eq(userPerms.userId, userId)),
    deleteUserPermsRows: (ids) =>
      db().delete(userPerms).where(inArray(userPerms.id, ids)),
    revokeSessions: (userId) =>
      db().delete(authSession).where(eq(authSession.userId, userId)),
  }

  const bulkByFlag = {
    getUserPermsForProvider: (providerId) =>
      db().select().from(userPerms).where(eq(userPerms.providerId, providerId)),
  }

  return {
    lookupUserId,
    revokeAccess,
    bulkByFlag,
  }
}

module.exports = {
  revokeProviderAccess,
  applyToUsersWithPermsFlag,
  createRevocationDeps,
}
