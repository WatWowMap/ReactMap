import { eq } from 'drizzle-orm'

import { getAuth } from './auth'
import { userPerms } from './db/auth-schema'
import { getDrizzle } from './db/drizzle'
import { mergePerms as mergePermsPair } from './utils/mergePerms'

/**
 * Folds the per-provider `user_perms` rows into the single perms object the
 * client expects. Copied from `server/src/middleware/auth-session.js` rather
 * than imported: that file is the Express `req.user` shim Task 7 deletes,
 * and this route has no Express request to attach anything to.
 *
 */
function mergePerms(
  rows: { providerId: string; perms: Record<string, boolean> }[],
): Record<string, any> {
  return rows.reduce(
    (merged, row) => mergePermsPair(merged, row.perms || {}),
    {} as Record<string, any>,
  )
}

/**
 * Builds the `/api/settings` response body.
 *
 * The 2.0 client (`app/session/use-session.ts`, `app/session/types.ts`)
 * reads exactly `user.loggedIn`, `user.username`, and `user.perms` -- it has
 * no `menus`, `map`, `authReferences`, `tileServers`, or any of the other
 * fields the Express `getServerSettings` built for the 1.0 client, which
 * this route no longer serves. This does not reconstruct a `req.user`-shaped
 * object; it builds the context directly from a Better Auth session and the
 * real `user_perms` rows.
 *
 * Deps are injected the same way `authSessionMiddleware` injects them, so
 * this is testable without a live Better Auth instance or a database.
 *
 */
async function buildSettingsResponse(
  headers: Headers,
  deps: {
    getSession: (headers: Headers) => Promise<any>
    getPerms: (userId: string) => Promise<any[]>
  },
) {
  let session = null
  try {
    // A garbage/expired cookie must still yield an anonymous response, not
    // a 500 -- this has broken this route twice on this branch already.
    session = await deps.getSession(headers)
  } catch {
    session = null
  }

  if (!session?.user) {
    return {
      user: { loggedIn: false, perms: {} },
      authentication: { loggedIn: false },
    }
  }

  const rows = await deps.getPerms(session.user.id)

  return {
    user: {
      loggedIn: true,
      username: session.user.username,
      perms: mergePerms(rows),
    },
    authentication: { loggedIn: true },
  }
}

/** Wires the handler to the real auth instance and database. */
function createSettingsHandler() {
  const deps = {
    getSession: (headers: Headers) => getAuth().api.getSession({ headers }),
    getPerms: (userId: string) =>
      getDrizzle().select().from(userPerms).where(eq(userPerms.userId, userId)),
  }

  return async function settingsHandler(request: Request) {
    const body = await buildSettingsResponse(request.headers, deps)
    return Response.json(body)
  }
}

export { buildSettingsResponse, createSettingsHandler, mergePerms }
