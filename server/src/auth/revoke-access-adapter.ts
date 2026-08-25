// server/src/auth/revokeAccessAdapter.ts
import { and, eq, inArray } from 'drizzle-orm'

import { authAccount, authSession, userPerms } from '../db/auth-schema'
import { getDrizzle } from '../db/drizzle'

import {
  planProviderRevocation,
  selectUserIdsByPermsFlag,
} from './revoke-access'

/**
 * Removes a user's `user_perms` row for one provider and revokes every
 * session they hold. Correct for a Discord guild removal and a trial's
 * expiry: in both cases the access is simply gone, so there is nothing left
 * to recompute -- unlike a role change, where the user may have gained
 * perms as well as lost them.
 *
 */
async function revokeProviderAccess(
  userId: string,
  providerId: string,
  deps: {
    getUserPerms: (
      userId: string,
    ) => Promise<{ id: string; userId: string; providerId: string }[]>
    deleteUserPermsRows: (ids: string[]) => Promise<void>
    revokeSessions: (userId: string) => Promise<void>
  },
) {
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
 */
async function applyToUsersWithPermsFlag(
  providerId: string,
  flagKey: string,
  flagValue: any,
  deps: {
    getUserPermsForProvider: (
      providerId: string,
    ) => Promise<
      { userId: string; providerId: string; perms: Record<string, any> }[]
    >
    apply: (userId: string) => Promise<void>
  },
) {
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
  const db = () => getDrizzle()

  const lookupUserId = async (providerId: string, accountId: string) => {
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
    getUserPerms: (userId: string) =>
      db().select().from(userPerms).where(eq(userPerms.userId, userId)),
    deleteUserPermsRows: (ids: string[]) =>
      db().delete(userPerms).where(inArray(userPerms.id, ids)),
    revokeSessions: (userId: string) =>
      db().delete(authSession).where(eq(authSession.userId, userId)),
  }

  const bulkByFlag = {
    getUserPermsForProvider: (providerId: string) =>
      db().select().from(userPerms).where(eq(userPerms.providerId, providerId)),
  }

  return {
    lookupUserId,
    revokeAccess,
    bulkByFlag,
  }
}

export { applyToUsersWithPermsFlag, createRevocationDeps, revokeProviderAccess }
