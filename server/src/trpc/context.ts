// server/src/trpc/context.ts
//
// Context for every tRPC procedure, built from a Better Auth session read
// off raw headers -- `auth.api.getSession({ headers })` is the same shape a
// WebSocket upgrade request hands you (transport spec, "Auth"), so this one
// function backs both the HTTP `fetchRequestHandler` mount and the manual
// session read the WebSocket bridge does at upgrade time
// (`server/src/ws/socket-server.js`).
//
// Anonymous is a valid context, not an error: `session` is `null` for a
// signed-out visitor, and so is `perms`. The two nulls travel together and
// mean different things to `require-perm.ts`: a null `perms` is "there is
// no account", an empty one is "we loaded this account's perms and it holds
// none". A signed-in context carries the merged `user_perms` rows, re-read
// on every request so that losing a role revokes the capability with it.

import config from '@rm/config'
import { eq } from 'drizzle-orm'

import { getAuth } from '../auth'
import { userPerms } from '../db/auth-schema'
import { getDrizzle } from '../db/drizzle'
import {
  createPoracleClient,
  type PoracleClient,
  poracleConfigured,
} from '../services/poracle-client'
import { mergePerms } from '../settings-response'

async function resolveSession(
  headers: Headers,
): Promise<{ user: any; session: any } | null> {
  try {
    return await getAuth().api.getSession({ headers })
  } catch {
    // A garbage/expired cookie must yield an anonymous context, not a
    // thrown error -- same rule `settings-response.js` already follows.
    return null
  }
}

/** The real `user_perms` rows, used when a caller injects nothing else. */
function loadPerms(userId: string): Promise<any[]> {
  return getDrizzle()
    .select()
    .from(userPerms)
    .where(eq(userPerms.userId, userId))
}

/**
 * The Poracle client for this deployment, or `null` when there is none.
 *
 * Built once, like `golbatClient`, rather than per request: it holds nothing
 * request-scoped. `null` is a real answer the Alerts procedures act on --
 * "there is no Poracle" is not the same as "you have no human there".
 */
function buildPoracleClient(): PoracleClient | null {
  return poracleConfigured() ? createPoracleClient() : null
}

function createContextFactory({
  golbatClient,
  registry,
  getSession = resolveSession,
  getPerms = loadPerms,
  poracleClient = buildPoracleClient(),
  poracleConfig = config.getSafe('poracle'),
}: {
  golbatClient: any
  // Task 6's routing table, so a tRPC subscription receives pushed fort
  // changes on the same terms the WebSocket bridge does. Optional: a
  // caller that has not built one still gets a working poll loop.
  registry?: any
  // Injected the same way `buildSettingsResponse` takes its deps, so the
  // context is testable without a live Better Auth instance or a database.
  getSession?: (headers: Headers) => Promise<{ user: any; session: any } | null>
  getPerms?: (userId: string) => Promise<any[]>
  poracleClient?: PoracleClient | null
  poracleConfig?: any
}) {
  return async function createContext({ req }: { req: Request }) {
    const session = await getSession(req.headers)
    const user = session?.user ?? null
    return {
      user,
      session: session?.session ?? null,
      perms: user ? mergePerms(await getPerms(user.id)) : null,
      golbatClient,
      registry,
      poracleClient,
      poracleConfig,
      // Left absent on purpose: resolving the linked Discord account is a
      // query, and only the Alerts procedures need it. `alerts-router.ts`
      // resolves it lazily so every other request does not pay for it.
    }
  }
}

export { createContextFactory, resolveSession }
