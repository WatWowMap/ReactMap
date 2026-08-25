// server/src/services/fort-injection-match.ts
//
// "Does this pushed fort belong to this subscription?" -- asked in two
// places, so it lives in neither of them.
//
// `subscription-registry.ts` asks it when a webhook batch is fanned out,
// to decide whose queue an injection lands in. `map-subscription.ts` asks
// it again when the loop drains that queue, because the two moments are
// not the same moment: a client can pan between them. An injection matched
// against viewport A and delivered after the client moved to viewport B
// reaches it as `added` for a fort it is no longer looking at, and is then
// taken straight back off by the next reconciliation sweep. The registry
// alone cannot prevent that -- only the drain knows the viewport that is
// current when the delta actually goes out.
//
// A removal is exempt. It goes to every gym subscription regardless of
// position or filters, and the receiving side drops it if its own
// `previousMap` was not holding that id. See the routing rules in
// `subscription-registry.ts` for why matching a removal on a position is
// worse than not matching it at all.

import type { WebhookInjection } from './golbat-webhook'

interface Viewport {
  min: { lat: number; lon: number }
  max: { lat: number; lon: number }
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

/**
 * Whether one injection belongs to a subscription holding `viewport` and
 * the filter predicate `matchesFilters` (build it with `matchesFortFilters`
 * from golbat-dnf-match.ts -- there is deliberately no second matcher).
 */
function injectionMatches(
  injection: WebhookInjection,
  viewport: Viewport,
  matchesFilters: (entity: any) => boolean,
): boolean {
  if (injection.category !== 'gym') return false
  if (injection.kind === 'remove') return true

  const { lat, lon } = injection.entity as { lat?: unknown; lon?: unknown }
  // A payload with no position is a Golbat-side defect, not a reason to
  // drop a real change on the floor -- deliver it and let the client merge
  // it over the position it already has.
  if (isNumber(lat) && isNumber(lon)) {
    if (!containsPoint(viewport, lat, lon)) return false
  }
  return matchesFilters(injection.entity)
}

export type { Viewport }
export { containsPoint, injectionMatches }
