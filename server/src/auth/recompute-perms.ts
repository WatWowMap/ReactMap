// server/src/auth/recomputePerms.ts
import crypto from 'crypto'

// Mirrors `derivedId` in
// `server/src/db/migrations/*_backfill_auth_users.cjs`. auth_account.id and
// user_perms.id are varchar(36), and concatenating `${userId}:${providerId}`
// overflows that column, so both writers hash to a stable 36-character id
// instead of using the concatenation directly. Keeping the two derivations
// byte-identical is what makes a sign-in-time recompute update the row the
// back-fill wrote rather than insert a duplicate next to it.
function derivedId(...parts: string[]) {
  return crypto
    .createHash('sha256')
    .update(`reactmap-derived:${parts.join(':')}`)
    .digest('hex')
    .slice(0, 36)
}

/**
 * Recomputes the `user_perms` rows for one user's linked accounts. Pure: it
 * takes the account rows already loaded and a map of provider id to a
 * perms-computing function, and returns the rows to upsert. It does no I/O,
 * so it is testable without a database or a live Discord/Telegram
 * connection.
 *
 * A provider with no entry in `computers` (nothing configured for it, or a
 * provider this function does not know how to compute perms for) is skipped
 * rather than erroring, same as a compute function that resolves to a
 * falsy value: the account is still linked, there is just nothing new to
 * write for it.
 *
 */
async function computeUserPermsRows(
  accounts: { userId: string; providerId: string; accountId: string }[],
  computers: Record<
    string,
    (
      accountId: string,
      userId: string,
    ) => Promise<Record<string, any> | null | undefined>
  >,
): Promise<
  {
    id: string
    userId: string
    providerId: string
    perms: Record<string, any>
  }[]
> {
  const rows: {
    id: string
    userId: string
    providerId: string
    perms: Record<string, any>
  }[] = []
  for (const account of accounts) {
    const compute = computers[account.providerId]
    if (!compute) continue
    const perms = await compute(account.accountId, account.userId)
    if (!perms) continue
    rows.push({
      id: derivedId(account.userId, account.providerId),
      userId: account.userId,
      providerId: account.providerId,
      perms,
    })
  }
  return rows
}

export { computeUserPermsRows, derivedId }
