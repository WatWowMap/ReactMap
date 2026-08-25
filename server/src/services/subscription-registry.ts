// server/src/services/subscription-registry.ts
//
// Task 6 of the transport plan: the routing table a pushed fort change is
// looked up in. `golbat-webhook.ts` turns one POST into injections;
// `map-subscription.ts` delivers them; this decides WHICH live
// subscriptions each one belongs to.
//
// Why a registry exists at all: subscriptions live per-socket on
// `ws.data.subscriptions` (`server/src/ws/socket-server.ts`), reachable
// only from the connection that owns them. An HTTP request arriving on
// `/api/webhooks/golbat` has no connection, so without a process-wide
// index there is nothing for it to fan out to.
//
// Registration is not optional bookkeeping. An entry that outlives its
// subscription is both a leak -- one dead `SubscriptionState` retained per
// disconnect, forever -- and a correctness problem, since every subsequent
// webhook does matching work for a connection that will never read the
// result. `register` therefore returns its own `unregister`, and the
// socket server calls it on close and on abort.
//
// Routing rules:
//   - Only `gym` subscriptions take gym injections. Nothing else is
//     produced yet (see golbat-webhook.ts).
//   - An upsert must fall inside the subscription's viewport AND satisfy
//     its filters. Both go through `injectionMatches`
//     (fort-injection-match.ts), which wraps `matchesFortFilters` -- the
//     same predicate the poll path uses as `computeDelta`'s `localFilter`,
//     so there is one answer to "does this gym match this clause" rather
//     than two that drift. The drain in `map-subscription.ts` asks the
//     same question again against the viewport that is current when the
//     delta actually goes out, since the client may have panned in
//     between.
//   - A removal goes to every gym subscription regardless of viewport or
//     filters. The registry cannot know which connections were holding the
//     fort -- only each subscription's own `previousMap` knows that, and
//     the injection tick already drops a removal for an id it was not
//     tracking. Matching a removal on the fort's last known position would
//     be worse than useless: a fort removed while outside a viewport it had
//     been inside, or a `fort_update` removal whose payload lacks a
//     position, would stay on the client's map forever.

import { log, TAGS } from '@rm/logger'

import { injectionMatches, type Viewport } from './fort-injection-match'
import { matchesFortFilters } from './golbat-dnf-match'
import type { WebhookInjection } from './golbat-webhook'
import { injectIntoSubscription } from './map-subscription'

interface RegisteredSubscription {
  category: 'pokemon' | 'gym'
  state: {
    viewport: Viewport
    filters: object[]
    injections: WebhookInjection[]
    wake: (() => void) | null
    wakePending: boolean
  }
}

function injectionsFor(
  entry: RegisteredSubscription,
  injections: WebhookInjection[],
): WebhookInjection[] {
  if (entry.category !== 'gym') return []
  const matchesFilters = matchesFortFilters(entry.state.filters)
  return injections.filter((injection) =>
    injectionMatches(injection, entry.state.viewport, matchesFilters),
  )
}

// How many (injection x subscription) match attempts one fan-out chunk is
// allowed before it yields the event loop.
//
// The matching is O(injections x subscriptions) and neither dimension is
// bounded by anything ReactMap controls: the batch size is whatever Golbat
// -- or an unauthenticated caller, since the secret is optional -- puts in
// the body, and the subscription count is however many people have the map
// open. Done in one synchronous pass, a large batch against a busy
// instance blocks every socket, every other request and Golbat's own next
// POST for as long as it takes. Measured against this code before the
// chunking: 3,000 subscriptions x 200,000 injections was 8.4 seconds of
// frozen event loop.
//
// 50,000 is roughly a millisecond of matching, which is a fair share of a
// tick to take. The rest of the fan-out continues on later ticks. There is
// a cap on batch size too (`MAX_WEBHOOK_BATCH_ENTRIES` in
// golbat-webhook-handler.ts); this is the half that holds regardless of
// what got past it.
const DISPATCH_WORK_BUDGET = 50_000

/**
 * The process-wide index of live subscriptions, and the fan-out of one
 * batch of pushed changes across it.
 */
function createSubscriptionRegistry() {
  const entries = new Set<RegisteredSubscription>()

  return {
    /** @returns the unregister for this entry; safe to call more than once. */
    register(entry: RegisteredSubscription): () => void {
      entries.add(entry)
      return () => {
        entries.delete(entry)
      }
    },

    /**
     * Routes one parsed webhook batch to every subscription that wants
     * any of it. In-memory by design: the receiver answers Golbat while
     * holding nothing open.
     *
     * That matters more than it looks, because Golbat has NO client-side
     * safety net. Its sender builds the HTTP client as a bare
     * `&http.Client{}` (webhooks/webhook.go:192), Go's zero value, which
     * has no request timeout, and `sendCollection` uses a plain
     * `http.NewRequest` with no context deadline (webhooks/webhook.go:127)
     * -- so `Do` blocks for as long as the receiver keeps the connection
     * open. Meanwhile `sender.Run()` fires `go sender.Flush()` on its
     * ticker regardless of whether the previous flush finished. A receiver
     * that hangs therefore accumulates blocked goroutines and connections
     * on Golbat's side, uncapped, until something else gives. Nothing
     * upstream will unstick it; not blocking is entirely ReactMap's job.
     */
    dispatch(injections: WebhookInjection[]) {
      if (injections.length === 0) return
      // Snapshotted so a subscription registering or ending mid-fan-out
      // cannot disturb the walk. `entries.has` below is what keeps a
      // subscription that ended in between from being delivered to.
      const targets = [...entries]
      const chunkSize = Math.max(
        1,
        Math.floor(DISPATCH_WORK_BUDGET / injections.length),
      )
      let next = 0

      const deliverChunk = () => {
        const end = Math.min(next + chunkSize, targets.length)
        for (; next < end; next += 1) {
          const entry = targets[next]
          if (!entry || !entries.has(entry)) continue
          const mine = injectionsFor(entry, injections)
          if (mine.length === 0) continue
          try {
            injectIntoSubscription(entry.state as any, mine)
          } catch (err) {
            // One subscription that has come apart -- a socket closed
            // between the fan-out starting and this entry being reached --
            // must not cost every later entry its delivery.
            log.error(
              TAGS.ReactMap,
              `failed to deliver a Golbat webhook change to a subscription: ${
                (err as any)?.message || err
              }`,
            )
          }
        }
        // A tick, not a microtask: a microtask queue drained before the
        // loop turns is the same stall wearing a different hat.
        if (next < targets.length) setTimeout(deliverChunk, 0)
      }

      deliverChunk()
    },

    /** Live entry count. Exposed so a leak is observable rather than inferred. */
    size() {
      return entries.size
    },
  }
}

export type { RegisteredSubscription }
export { createSubscriptionRegistry }
