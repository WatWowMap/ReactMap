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
//     its filters. Filters go through `matchesFortFilters`
//     (golbat-dnf-match.ts) rather than a second matcher written here --
//     this is the same predicate the poll path uses as `computeDelta`'s
//     `localFilter`, and two implementations of "does this gym match this
//     clause" would drift.
//   - A removal goes to every gym subscription regardless of viewport or
//     filters. The registry cannot know which connections were holding the
//     fort -- only each subscription's own `previousMap` knows that, and
//     the injection tick already drops a removal for an id it was not
//     tracking. Matching a removal on the fort's last known position would
//     be worse than useless: a fort removed while outside a viewport it had
//     been inside, or a `fort_update` removal whose payload lacks a
//     position, would stay on the client's map forever.

import { log, TAGS } from '@rm/logger'

import { matchesFortFilters } from './golbat-dnf-match'
import type { WebhookInjection } from './golbat-webhook'
import { injectIntoSubscription } from './map-subscription'

interface Viewport {
  min: { lat: number; lon: number }
  max: { lat: number; lon: number }
}

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

/**
 * Whether a coordinate falls inside a viewport, handling the antimeridian
 * case where a westward pan leaves `min.lon` greater than `max.lon` (a box
 * from 170 to -170 covers 20 degrees across the date line, not the 340 the
 * other way round).
 */
function containsPoint(viewport: Viewport, lat: number, lon: number): boolean {
  if (lat < viewport.min.lat || lat > viewport.max.lat) return false
  if (viewport.min.lon <= viewport.max.lon) {
    return lon >= viewport.min.lon && lon <= viewport.max.lon
  }
  return lon >= viewport.min.lon || lon <= viewport.max.lon
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function injectionsFor(
  entry: RegisteredSubscription,
  injections: WebhookInjection[],
): WebhookInjection[] {
  if (entry.category !== 'gym') return []
  const matchesFilters = matchesFortFilters(entry.state.filters)

  return injections.filter((injection) => {
    if (injection.category !== 'gym') return false
    if (injection.kind === 'remove') return true

    const { lat, lon } = injection.entity as { lat?: unknown; lon?: unknown }
    // A payload with no position is a Golbat-side defect, not a reason to
    // drop a real change on the floor -- deliver it and let the client
    // merge it over the position it already has.
    if (isNumber(lat) && isNumber(lon)) {
      if (!containsPoint(entry.state.viewport, lat, lon)) return false
    }
    return matchesFilters(injection.entity)
  })
}

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
     * Routes one parsed webhook batch to every subscription that wants any
     * of it. Synchronous and in-memory by design: the receiver answers
     * Golbat while holding nothing open, because Golbat's sender is
     * fire-and-forget on a short timeout (webhooks/webhook.go).
     */
    dispatch(injections: WebhookInjection[]) {
      if (injections.length === 0) return
      for (const entry of entries) {
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
    },

    /** Live entry count. Exposed so a leak is observable rather than inferred. */
    size() {
      return entries.size
    },
  }
}

export type { RegisteredSubscription }
export { containsPoint, createSubscriptionRegistry }
