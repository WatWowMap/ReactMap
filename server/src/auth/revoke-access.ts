// server/src/auth/revokeAccess.ts

/**
 * Pure: decides which of a user's `user_perms` rows survive one provider
 * being revoked. Exists so the revocation decision -- which row goes away,
 * which stay -- is testable without a database. The adapter that calls this
 * turns `removed` into an actual DELETE and revokes the user's sessions.
 *
 */
type PermsRow = { id: string; userId: string; providerId: string }

function planProviderRevocation(
  rows: PermsRow[],
  userId: string,
  providerId: string,
): { removed: PermsRow[]; remaining: PermsRow[] } {
  const removed: PermsRow[] = []
  const remaining: PermsRow[] = []
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
 */
function selectUserIdsByPermsFlag(
  rows: { userId: string; providerId: string; perms: Record<string, any> }[],
  providerId: string,
  flagKey: string,
  flagValue: any,
): string[] {
  const userIds = rows
    .filter(
      (row) =>
        row.providerId === providerId && row.perms?.[flagKey] === flagValue,
    )
    .map((row) => row.userId)
  return [...new Set(userIds)]
}

export { planProviderRevocation, selectUserIdsByPermsFlag }
