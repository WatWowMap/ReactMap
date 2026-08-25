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
// signed-out visitor, and callers decide what that means for a given
// procedure (nothing in this task enforces a permission on any procedure --
// see the Task 5 report for why that is out of scope here).

import { getAuth } from '../auth'

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

function createContextFactory({
  golbatClient,
  registry,
}: {
  golbatClient: any
  // Task 6's routing table, so a tRPC subscription receives pushed fort
  // changes on the same terms the WebSocket bridge does. Optional: a
  // caller that has not built one still gets a working poll loop.
  registry?: any
}) {
  return async function createContext({ req }: { req: Request }) {
    const session = await resolveSession(req.headers)
    return {
      user: session?.user ?? null,
      session: session?.session ?? null,
      golbatClient,
      registry,
    }
  }
}

export { createContextFactory, resolveSession }
