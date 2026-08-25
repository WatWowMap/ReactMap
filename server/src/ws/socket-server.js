// @ts-check
// server/src/ws/socket-server.js
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

const { randomUUID } = require('crypto')
const { log, TAGS } = require('@rm/logger')

const { resolveSession } = require('../trpc/context')
const {
  createSubscriptionState,
  updateSubscription,
  subscribeCategory,
  pollIntervalForCategory,
} = require('../services/map-subscription')

const REVOCATION_CHECK_INTERVAL_MS = 60_000
const VALID_CATEGORIES = new Set(['pokemon', 'gym'])

/**
 * @param {{golbatClient: any}} deps
 */
function createSocketServer({ golbatClient }) {
  /**
   * @param {Request} request
   * @param {import('bun').Server} server
   * @returns {Promise<boolean>} whether the upgrade succeeded
   */
  async function upgrade(request, server) {
    const session = await resolveSession(request.headers)
    return server.upgrade(request, {
      data: {
        id: randomUUID(),
        // Kept verbatim (not just the parsed session) so the revocation
        // backstop can re-derive a fresh session from the same credential
        // later, rather than trusting the connect-time snapshot.
        cookie: request.headers.get('cookie') || '',
        userId: session?.user?.id ?? null,
        /** @type {Map<'pokemon'|'gym', {state: any, controller: AbortController}>} */
        subscriptions: new Map(),
        /** @type {ReturnType<typeof setInterval> | null} */
        revocationTimer: null,
      },
    })
  }

  /**
   * @param {any} ws
   * @param {'pokemon'|'gym'} category
   * @param {object} viewport
   * @param {object[]} filters
   */
  function startOrUpdateSubscription(ws, category, viewport, filters) {
    const existing = ws.data.subscriptions.get(category)
    if (existing) {
      updateSubscription(existing.state, { viewport, filters })
      return
    }

    const controller = new AbortController()
    const state = createSubscriptionState({ category, viewport, filters })
    ws.data.subscriptions.set(category, { state, controller })

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
      }
    })()
  }

  /** @param {any} ws */
  function stopAllSubscriptions(ws) {
    for (const { controller } of ws.data.subscriptions.values()) {
      controller.abort()
    }
    ws.data.subscriptions.clear()
  }

  /** @param {any} ws */
  function startRevocationBackstop(ws) {
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
    /** @param {any} ws */
    open(ws) {
      ws.data.revocationTimer = startRevocationBackstop(ws)
    },
    /**
     * @param {any} ws
     * @param {string | Buffer} raw
     */
    message(ws, raw) {
      let msg
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
    /** @param {any} ws */
    close(ws) {
      stopAllSubscriptions(ws)
      if (ws.data.revocationTimer) clearInterval(ws.data.revocationTimer)
    },
  }

  return { upgrade, websocket }
}

module.exports = { createSocketServer }
