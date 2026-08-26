// server/src/services/poracle-human.ts
import type { PoracleClient } from './poracle-client'

type HumanState = 'present' | 'absent' | 'unreachable'

/**
 * Whether this person has a Poracle human, cached per user for the session.
 *
 * ReactMap never creates one. Poracle does that when the right Discord roles
 * land, so the only question here is whether one exists.
 *
 * Three states, not two, and 1.x could not tell two of them apart: it gated on
 * a role-derived permission and called oneHuman only to read blocked_alerts,
 * so a missing human and a dead Poracle both produced an empty tab with dead
 * buttons. Poracle's own responses separate them cleanly -- resolveHuman 404s
 * an unknown id and never autocreates.
 */
const cache = new Map<string, HumanState>()

function cachedHumanState(userId: string): HumanState | undefined {
  return cache.get(userId)
}

function rememberHumanState(userId: string, state: HumanState): void {
  cache.set(userId, state)
}

/** Test seam. Module state would otherwise leak between tests. */
function __resetHumanCache(): void {
  cache.clear()
}

async function checkHuman(
  client: PoracleClient,
  platformId: string,
): Promise<HumanState> {
  try {
    const res = await client.get(`/v2/humans/${encodeURIComponent(platformId)}`)
    if (res.status === 404) return 'absent'
    if (res.status >= 200 && res.status < 300) return 'present'
    return 'unreachable'
  } catch {
    return 'unreachable'
  }
}

/**
 * The cached answer, refreshed when it can be. An unreachable Poracle keeps
 * whatever was last known rather than downgrading a working tab, which is what
 * stops a brief restart from hiding Alerts for everyone at once.
 */
async function resolveHumanState(
  client: PoracleClient,
  userId: string,
  platformId: string,
): Promise<HumanState> {
  const state = await checkHuman(client, platformId)
  if (state === 'unreachable') {
    return cache.get(userId) ?? 'unreachable'
  }
  cache.set(userId, state)
  return state
}

export type { HumanState }
export {
  __resetHumanCache,
  cachedHumanState,
  checkHuman,
  rememberHumanState,
  resolveHumanState,
}
