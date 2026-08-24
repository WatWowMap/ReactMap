// server/src/auth/revokeAccess.js
// @ts-check

/**
 * Pure: decides which of a user's `user_perms` rows survive one provider
 * being revoked. Exists so the revocation decision -- which row goes away,
 * which stay -- is testable without a database. The adapter that calls this
 * turns `removed` into an actual DELETE and revokes the user's sessions.
 *
 * @param {{ id: string, userId: string, providerId: string }[]} rows
 * @param {string} userId
 * @param {string} providerId
 * @returns {{
 *   removed: { id: string, userId: string, providerId: string }[],
 *   remaining: { id: string, userId: string, providerId: string }[],
 * }}
 */
function planProviderRevocation(rows, userId, providerId) {
  const removed = []
  const remaining = []
  for (const row of rows) {
    if (row.userId === userId && row.providerId === providerId) {
      removed.push(row)
    } else {
      remaining.push(row)
    }
  }
  return { removed, remaining }
}

/**
 * Pure: the distinct userIds whose `user_perms` row for `providerId` has
 * `perms[flagKey] === flagValue`. Used to find every user a bulk Trial event
 * (start or expiry) applies to, without a live database.
 *
 * @param {{ userId: string, providerId: string, perms: Record<string, any> }[]} rows
 * @param {string} providerId
 * @param {string} flagKey
 * @param {any} flagValue
 * @returns {string[]}
 */
function selectUserIdsByPermsFlag(rows, providerId, flagKey, flagValue) {
  const userIds = rows
    .filter(
      (row) =>
        row.providerId === providerId && row.perms?.[flagKey] === flagValue,
    )
    .map((row) => row.userId)
  return [...new Set(userIds)]
}

module.exports = { planProviderRevocation, selectUserIdsByPermsFlag }
