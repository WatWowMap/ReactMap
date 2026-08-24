import { expect, test } from 'bun:test'
import {
  type ClusterableEntity,
  type ClusterRules,
  clusterEntities,
} from './clustering'
import type { Bounds } from './types'

const BOUNDS: Bounds = { west: -1, south: 51, east: 1, north: 52 }

/** Scatters `count` points across `BOUNDS` with a deterministic PRNG, so a
 * run that fails does so for the same reason every time. */
function scatter(count: number): ClusterableEntity[] {
  let state = 20260824
  const rng = () => {
    state = (state + 0x6d2b79f5) | 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return Array.from({ length: count }, (_, index) => ({
    id: `entity-${index}`,
    lat: BOUNDS.south + rng() * (BOUNDS.north - BOUNDS.south),
    lon: BOUNDS.west + rng() * (BOUNDS.east - BOUNDS.west),
  }))
}

const RULES: ClusterRules = { zoomLevel: 10, forcedLimit: 200, minPoints: 5 }

/*
 * This is the regression test for the 1.0 forcedLimit bug (see the task
 * brief for the line-numbered trace through Clustering.jsx). Supercluster's
 * `maxZoom` is the zoom ABOVE WHICH it stops clustering and returns raw
 * points; 1.0 built its clusterer with `maxZoom: rules.zoomLevel` and
 * trusted that same clusterer to enforce `forcedLimit`. Above `zoomLevel`,
 * clustering switches itself off and the cap goes with it, at exactly the
 * zoom where the most markers are on screen.
 *
 * 2000 entities, a limit of 200, queried at zoom 20 (10 past zoomLevel):
 * the ported bug returns every one of the 2000 unclustered, because
 * supercluster has stopped clustering by then and nothing else was
 * capping the result.
 */
test('clusterEntities bounds the rendered count at a zoom past zoomLevel', () => {
  const entities = scatter(2000)
  const result = clusterEntities(entities, BOUNDS, 20, RULES)
  const rendered = result.clusters.length + result.points.length
  expect(rendered).toBeLessThanOrEqual(RULES.forcedLimit)
  expect(result.limitHit).toBe(true)
})

test('clusterEntities does not cap or flag limitHit when under the limit', () => {
  const entities = scatter(50)
  const result = clusterEntities(entities, BOUNDS, 20, RULES)
  expect(result.limitHit).toBe(false)
  expect(result.clusters.length + result.points.length).toBe(50)
})

test('clusterEntities groups nearby points into clusters below zoomLevel', () => {
  const entities = scatter(500)
  const result = clusterEntities(entities, BOUNDS, 2, RULES)
  expect(result.clusters.length).toBeGreaterThan(0)
  const clusteredCount = result.clusters.reduce((sum, c) => sum + c.count, 0)
  expect(clusteredCount + result.points.length).toBe(500)
})

test('clusterEntities keeps every cluster and truncates only loose points when capping', () => {
  const entities = scatter(2000)
  const result = clusterEntities(entities, BOUNDS, 20, RULES)
  // At zoom 20 (past zoomLevel 10) supercluster returns no clusters at all,
  // so this exercises the plain truncation path: the cap comes entirely
  // out of `points`, and `clusters` stays empty.
  expect(result.clusters.length).toBe(0)
  expect(result.points.length).toBe(RULES.forcedLimit)
})

test('clusterEntities is deterministic for the same inputs', () => {
  const entities = scatter(2000)
  const first = clusterEntities(entities, BOUNDS, 20, RULES)
  const second = clusterEntities(entities, BOUNDS, 20, RULES)
  expect(first.points.map((p) => p.id)).toEqual(second.points.map((p) => p.id))
})
