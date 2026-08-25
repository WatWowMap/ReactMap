// server/src/auth/telegram-groups.ts

/**
 * Which of the operator's configured Telegram groups an account currently
 * belongs to, plus the account's own id -- 1.x's `TelegramClient#getUserGroups`
 * folds the user's own id into this same list, because `getUserPerms` below
 * matches a perm's `roles` against it, and a perm's `roles` array is also
 * where an individual Telegram user id can be listed to target one person
 * directly (the Telegram equivalent of Discord's `allowedUsers`, but
 * per-perm rather than global-admin). That is preserved here rather than
 * "cleaned up": dropping it would silently break any config relying on it.
 *
 * A single group's membership check failing (network error, non-2xx, a
 * malformed body) is not treated as a reason to fail the whole computation
 * -- it is treated the same way 1.x did, as "this group could not be
 * confirmed, so do not count it", not as "the whole account failed and
 * nothing should be written". A Telegram outage affecting one group should
 * not erase every permission this user already has from other groups.
 *
 * @param groups Configured group chat ids to check membership in.
 * @param fetchImpl Injected for tests.
 */
async function fetchTelegramGroups(
  botToken: string,
  groups: string[],
  userId: string,
  fetchImpl: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response> = fetch,
): Promise<string[]> {
  if (!userId) return []

  const memberships = [userId]
  await Promise.all(
    groups.map(async (group) => {
      try {
        const response = await fetchImpl(
          `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${group}&user_id=${userId}`,
        )
        if (!response?.ok) return
        const json = await response.json()
        if (
          json?.result?.status !== 'left' &&
          json?.result?.status !== 'kicked'
        ) {
          memberships.push(group)
        }
      } catch (_e) {
        // Could not confirm membership in this one group; leave it out.
      }
    }),
  )
  return memberships
}

export { fetchTelegramGroups }
