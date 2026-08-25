// server/src/ws/socket-server.ts
//
// The WebSocket half of Task 5. Mounted at `/api/ws` in `server/src/serve.js`
// on Bun.serve's NATIVE websocket support (`server.upgrade`/`websocket:
// {open,message,close}`) -- not tRPC's own `@trpc/server/adapters/ws`. See
// the Task 5 report for the full finding; the short version is that
// `applyWSSHandler` is built on the `ws` npm package's `WebSocketServer`
// bound to a Node `http.Server`, which is a different object than
// `Bun.serve`'s upgrade path, and the acceptance suite's wire contract
// (`{"type":"subscribe",...}` / `{"type":"delta",...}`) is not tRPC's own
// JSON-RPC subscription wire format regardless. This module is a thin,
// honest bridge instead: plain JSON messages over a native Bun socket,
// backed by the SAME async-generator poll loop
// (`server/src/services/map-subscription.js`) that `server/src/trpc/router.js`
// wraps as a real tRPC subscription procedure for any consumer that can use
// a standard tRPC transport.
//
// Session: read once at upgrade from the raw request headers
// (`auth.api.getSession({ headers })`, same call `/api/settings` already
// makes) -- anonymous is a valid connection, not an error, matching the
// transport spec ("the map has to work for signed-out users on instances
// that allow it"). A 60 second interval re-checks a signed-in connection's
// session and closes the socket if it was revoked, covering the two gaps
// push-based revocation cannot ("Revocation" in the transport spec): a
// write landing on a different process, and a session revoked from another
// device.
//
// Per-connection state lives on `ws.data` (Bun's per-socket attachment,
// set once at `server.upgrade(request, { data })` and handed back on every
// callback): one `SubscriptionState`+`AbortController` pair per category,
// so a connection can hold a `pokemon` and a `gym` subscription
// concurrently, and a second `subscribe` message for a category already
// open updates it in place (`updateSubscription`) instead of starting a
// second poll loop racing the first.

import { log, TAGS } from '@rm/logger'
import { randomUUID } from 'crypto'
import {
  createSubscriptionState,
  pollIntervalForCategory,
  subscribeCategory,
  updateSubscription,
} from '../services/map-subscription'
import type { createSubscriptionRegistry } from '../services/subscription-registry'
import { resolveSession } from '../trpc/context'

const REVOCATION_CHECK_INTERVAL_MS = 60_000
const VALID_CATEGORIES = new Set(['pokemon', 'gym'])

function createSocketServer({
  golbatClient,
  registry,
}: {
  golbatClient: any
  // The process-wide routing table Task 6's webhook receiver fans out
  // through (`services/subscription-registry.ts`). Optional so a caller
  // that only wants the poll loop -- a test, or a build with the receiver
  // unmounted -- still gets a working socket.
  registry?: ReturnType<typeof createSubscriptionRegistry>
}) {
  /** @returns whether the upgrade succeeded */
  async function upgrade(request: Request, server: any): Promise<boolean> {
    const session = await resolveSession(request.headers)
    return server.upgrade(request, {
      data: {
        id: randomUUID(),
        // Kept verbatim (not just the parsed session) so the revocation
        // backstop can re-derive a fresh session from the same credential
        // later, rather than trusting the connect-time snapshot.
        cookie: request.headers.get('cookie') || '',
        userId: session?.user?.id ?? null,
        subscriptions: new Map<
          'pokemon' | 'gym',
          { state: any; controller: AbortController; unregister: () => void }
        >(),
        revocationTimer: null as ReturnType<typeof setInterval> | null,
      },
    })
  }

  function startOrUpdateSubscription(
    ws: any,
    category: 'pokemon' | 'gym',
    viewport: any,
    filters: object[],
  ) {
    const existing = ws.data.subscriptions.get(category)
    if (existing) {
      updateSubscription(existing.state, { viewport, filters })
      return
    }

    const controller = new AbortController()
    const state = createSubscriptionState({ category, viewport, filters })
    // Registered before the loop starts, so a webhook that lands between
    // the subscribe message and the first poll is still delivered. A
    // viewport change mutates this same `state` in place
    // (`updateSubscription`), so the registry keeps routing against
    // whatever the connection is currently looking at without needing to
    // re-register.
    const unregister = registry?.register({ category, state }) ?? (() => {})
    ws.data.subscriptions.set(category, { state, controller, unregister })

    ;(async () => {
      try {
        for await (const delta of subscribeCategory({
          golbatClient,
          state,
          signal: controller.signal,
          pollIntervalMs: pollIntervalForCategory(category),
        })) {
          if (controller.signal.aborted) break
          ws.send(JSON.stringify(delta))
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          log.error(
            TAGS.ReactMap,
            `map subscription (${category}) for connection ${ws.data.id} failed`,
            err,
          )
        }
      } finally {
        // The loop ending for ANY reason -- abort, a thrown poll, the
        // socket going away -- takes the registry entry with it. A
        // registry that only grows leaks a dead subscription per
        // disconnect and fans webhooks out to sockets that will never
        // read them.
        unregister()
        // And it takes the connection's own record of the subscription
        // with it too. A pokemon poll that throws (Golbat down, or not
        // configured at all) ends this loop for good; leaving the entry
        // behind would make every later `subscribe` for the category --
        // every viewport change the client makes -- take the
        // `updateSubscription` branch and mutate a state nothing is
        // reading, so the category stayed silent for the life of the
        // socket and only a page reload brought it back. Dropping the
        // entry makes the next subscribe start a fresh loop and retry.
        // Guarded on identity so a loop finishing after the category was
        // already resubscribed cannot delete the live one.
        if (ws.data.subscriptions.get(category)?.state === state) {
          ws.data.subscriptions.delete(category)
        }
      }
    })()
  }

  function stopAllSubscriptions(ws: any) {
    for (const { controller, unregister } of ws.data.subscriptions.values()) {
      controller.abort()
      // Also unregistered in the loop's `finally`, but not necessarily
      // yet: the generator only observes the abort when it next reaches a
      // suspension point. Unregistering here as well makes the entry gone
      // by the time `close` returns, and both paths are idempotent.
      unregister?.()
    }
    ws.data.subscriptions.clear()
  }

  function startRevocationBackstop(ws: any) {
    if (!ws.data.userId) return null
    return setInterval(async () => {
      const headers = new Headers({ cookie: ws.data.cookie })
      const session = await resolveSession(headers)
      if (!session?.user) {
        ws.close(1008, 'session revoked')
      }
    }, REVOCATION_CHECK_INTERVAL_MS)
  }

  const websocket = {
    open(ws: any) {
      ws.data.revocationTimer = startRevocationBackstop(ws)
    },
    message(ws: any, raw: string | Buffer) {
      let msg: any
      try {
        msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString())
      } catch {
        return
      }
      if (
        msg?.type === 'subscribe' &&
        VALID_CATEGORIES.has(msg.category) &&
        msg.viewport
      ) {
        startOrUpdateSubscription(
          ws,
          msg.category,
          msg.viewport,
          Array.isArray(msg.filters) ? msg.filters : [],
        )
      }
    },
    close(ws: any) {
      stopAllSubscriptions(ws)
      if (ws.data.revocationTimer) clearInterval(ws.data.revocationTimer)
    },
  }

  return { upgrade, websocket }
}

export { createSocketServer }
