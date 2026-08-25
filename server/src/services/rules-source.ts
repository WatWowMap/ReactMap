// server/src/services/rules-source.ts
//
// The one place a live subscription's rules come from: the profile of
// whoever is on the other end of the socket.
//
// Both transports build theirs here (`ws/socket-server.ts` and the
// `map.subscribe` tRPC procedure) so neither can drift into resolving a
// different user's rules than the other, and neither can be talked into
// reading a profile id off the wire -- `userId` arrives from a Better Auth
// session and nothing else.

import type { RulesSource } from './map-subscription'
import { currentRulesVersion, findProfileId, listRules } from './rules-repo'

/**
 * A rules source for one signed-in connection, or `undefined` for an
 * anonymous one -- an anonymous visitor has no profile to hold rules in, and
 * `subscribeCategory` treats the absence as "this connection is not rules
 * driven" rather than as an error.
 *
 * The profile id is resolved once and remembered for the life of the
 * connection: the plan gives an account exactly one, and it is the row every
 * later version check reads. A user who somehow has none yet (a seed that
 * failed) resolves to no rules, which is an empty map rather than a dead
 * socket.
 */
function createRulesSource({
  userId,
  getDb,
}: {
  userId: string | null | undefined
  getDb: () => any
}): RulesSource | undefined {
  if (!userId) return undefined

  let profileId: number | null = null
  async function resolveProfileId(db: any): Promise<number | null> {
    if (profileId == null) profileId = await findProfileId(db, userId as string)
    return profileId
  }

  return {
    async currentVersion() {
      const db = getDb()
      const id = await resolveProfileId(db)
      if (id == null) return 0
      return currentRulesVersion(db, id)
    },
    async loadRules() {
      const db = getDb()
      const id = await resolveProfileId(db)
      if (id == null) return []
      return listRules(db, userId as string, id)
    },
  }
}

export { createRulesSource }
