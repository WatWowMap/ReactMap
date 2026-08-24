// server/src/auth/maxSessions.js
// @ts-check

/**
 * Restores the `api.maxSessions` cap that passport's login callback used to
 * enforce (`Session.isValidSession` + `Session.clearOtherSessions`, deleted
 * with the rest of `server/src/models/Session.js` in Task 3 of this plan).
 *
 * Runs in the same `session.create.after` hook that recomputes perms, after
 * the new session row already exists, so `deps.listSessionIds` sees it and
 * the cap counts the session that was just created. `auth_session` can be
 * queried directly by `user_id` (`auth_session_user_id_idx`), which is why
 * this is simpler than the JSON-path query the deleted model used.
 *
 * Unlike the old `clearOtherSessions`, which wiped every other session down
 * to just the one being created, this trims only the excess: the oldest
 * sessions beyond the cap are deleted and the rest -- including sessions on
 * other devices, up to the limit -- are left alone. That is a narrower
 * reading of "cap" and a friendlier one for a user signed in on more than
 * one device.
 *
 * @param {string} userId
 * @param {{
 *   maxSessions: number,
 *   listSessionIds: (userId: string) => Promise<string[]>,
 *   deleteSessions: (ids: string[]) => Promise<void>,
 * }} deps
 */
async function enforceMaxSessions(userId, deps) {
  if (!deps.maxSessions || deps.maxSessions <= 0) return
  const ids = await deps.listSessionIds(userId)
  const excess = ids.length - deps.maxSessions
  if (excess <= 0) return
  await deps.deleteSessions(ids.slice(0, excess))
}

/**
 * Wires `enforceMaxSessions` to the real database. Required lazily so
 * importing this module never opens a database connection at load time,
 * same as `createRecomputeUserPerms` and `createSignInGateCheck`.
 *
 * @param {number} maxSessions
 */
function createEnforceMaxSessions(maxSessions) {
  return async function enforce(userId) {
    const { eq, asc, inArray } = require('drizzle-orm')
    const { getDrizzle } = require('../db/drizzle')
    const { authSession } = require('../db/auth-schema')

    const db = getDrizzle()
    return enforceMaxSessions(userId, {
      maxSessions,
      listSessionIds: async (id) => {
        const rows = await db
          .select({ id: authSession.id })
          .from(authSession)
          .where(eq(authSession.userId, id))
          .orderBy(asc(authSession.createdAt))
        return rows.map((row) => row.id)
      },
      deleteSessions: async (ids) => {
        if (!ids.length) return
        await db.delete(authSession).where(inArray(authSession.id, ids))
      },
    })
  }
}

module.exports = { enforceMaxSessions, createEnforceMaxSessions }
