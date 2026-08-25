import { expect, test } from 'bun:test'
import {
  type ClusterableEntity,
  type ClusterRules,
  clusterEntities,
  clusterIndexBuildCount,
  clusterIndexFor,
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

/**
 * `groupCount` well-separated groups of `size` entities each, laid out on a
 * grid across `BOUNDS`. This is the shape the uniform `scatter` above cannot
 * produce and the one that broke the cap: every group is far enough from its
 * neighbours to survive as its own cluster, so the cluster count alone runs
 * past `forcedLimit` while the loose-point budget is already zero. A map of
 * many small towns, each with a handful of gyms, viewed at country zoom.
 */
function groupsOf(groupCount: number, size: number): ClusterableEntity[] {
  const columns = Math.ceil(Math.sqrt(groupCount))
  const rows = Math.ceil(groupCount / columns)
  const entities: ClusterableEntity[] = []
  for (let group = 0; group < groupCount; group += 1) {
    const column = group % columns
    const row = Math.floor(group / columns)
    const lon =
      BOUNDS.west + ((column + 0.5) / columns) * (BOUNDS.east - BOUNDS.west)
    const lat =
      BOUNDS.south + ((row + 0.5) / rows) * (BOUNDS.north - BOUNDS.south)
    for (let member = 0; member < size; member += 1) {
      entities.push({
        id: `group-${group}-${member}`,
        lat: lat + member * 0.00002,
        lon: lon + member * 0.00002,
      })
    }
  }
  return entities
}

/** Every entity in this file carries its own id. */
const byOwnId = (entity: ClusterableEntity) => entity.id

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

/*
 * This asserted the earlier policy, keep every cluster and truncate points,
 * and it is now wrong on purpose: capping coarsens instead of truncating, so
 * a set that came back as 2000 loose points at zoom 20 comes back as clusters
 * drawn at whatever lower zoom first fits. What matters is that the total
 * binds and that nothing was thrown away to make it bind.
 */
test('clusterEntities caps by coarsening rather than by dropping markers', () => {
  const entities = scatter(2000)
  const result = clusterEntities(entities, BOUNDS, 20, RULES)
  expect(result.clusters.length).toBeGreaterThan(0)
  expect(result.clusters.length + result.points.length).toBeLessThanOrEqual(
    RULES.forcedLimit,
  )
  const represented =
    result.clusters.reduce((sum, cluster) => sum + cluster.count, 0) +
    result.points.length
  expect(represented).toBe(2000)
})

test('clusterEntities is deterministic for the same inputs', () => {
  const entities = scatter(2000)
  const first = clusterEntities(entities, BOUNDS, 20, RULES)
  const second = clusterEntities(entities, BOUNDS, 20, RULES)
  expect(first.points.map((p) => p.id)).toEqual(second.points.map((p) => p.id))
})

/*
 * The many-small-groups shape. `scatter` above is uniform, so at any zoom
 * past `zoomLevel` it yields loose points only and the cap comes entirely out
 * of the point budget - which is exactly why it passed while this failed.
 * With 800 separated groups of 5 the clusters alone are 800 against a limit
 * of 200, the point budget is already zero, and capping only points caps
 * nothing. Measured on the pre-fix code at gym rules and 3500 groups:
 * zoom 8, 10 and 13 each rendered 3500 clusters against a limit of 2500.
 */
test('clusterEntities bounds the total when clusters alone exceed the limit', () => {
  const entities = groupsOf(800, 5)
  for (const zoom of [4, 8, 10, 13, 20]) {
    const result = clusterEntities(entities, BOUNDS, zoom, RULES)
    const rendered = result.clusters.length + result.points.length
    expect(`zoom ${zoom}: ${rendered}`).toBe(
      `zoom ${zoom}: ${Math.min(rendered, RULES.forcedLimit)}`,
    )
  }
})

test('clusterEntities flags limitHit for the many-small-groups shape', () => {
  const result = clusterEntities(groupsOf(800, 5), BOUNDS, 10, RULES)
  expect(result.limitHit).toBe(true)
})

/*
 * Coarsening is what keeps the cap from being a silent deletion: every entity
 * in view is still standing behind some marker, just a bigger one. If this
 * ever regresses to truncation the sum drops below the input count.
 */
test('clusterEntities represents every entity even when it has to cap', () => {
  const entities = groupsOf(800, 5)
  const result = clusterEntities(entities, BOUNDS, 10, RULES)
  const represented =
    result.clusters.reduce((sum, cluster) => sum + cluster.count, 0) +
    result.points.length
  expect(represented).toBe(entities.length)
})

test('clusterEntities bounds a mix of one dense blob and many small groups', () => {
  const blob = Array.from({ length: 4000 }, (_, index) => ({
    id: `blob-${index}`,
    lat: BOUNDS.south + 0.5 + index * 0.000001,
    lon: BOUNDS.west + 0.5 + index * 0.000001,
  }))
  const entities = [...groupsOf(600, 5), ...blob, ...scatter(1000)]
  for (const zoom of [4, 10, 14, 20]) {
    const result = clusterEntities(entities, BOUNDS, zoom, RULES)
    const rendered = result.clusters.length + result.points.length
    expect(`zoom ${zoom}: ${rendered}`).toBe(
      `zoom ${zoom}: ${Math.min(rendered, RULES.forcedLimit)}`,
    )
  }
})

/*
 * Panning is a query, not a rebuild. supercluster's `load` builds a KD-tree
 * per zoom level so that `getClusters` can be a cheap range scan; measured on
 * this machine, build+load costs 16-119x what one query costs. The index
 * therefore has to outlive the camera, and `clusterIndexFor` is where that
 * lifetime is decided: same entity array and same rules, same index object.
 */
test('clusterIndexFor reuses the index across viewport and zoom changes', () => {
  const entities = scatter(500)
  const first = clusterIndexFor(entities, RULES, byOwnId)
  const second = clusterIndexFor(entities, RULES, byOwnId)
  expect(second).toBe(first)
  first.query(BOUNDS, 12)
  first.query({ west: -0.5, south: 51.2, east: 0.5, north: 51.8 }, 16)
  expect(clusterIndexFor(entities, RULES, byOwnId)).toBe(first)
})

test('clusterIndexFor rebuilds when the entity set changes', () => {
  const entities = scatter(500)
  const first = clusterIndexFor(entities, RULES, byOwnId)
  expect(clusterIndexFor([...entities], RULES, byOwnId)).not.toBe(first)
})

/*
 * `maxZoom` and `minPoints` are constructor arguments, so a rules change is
 * not something a query can pick up -- the index has to go.
 */
test('clusterIndexFor rebuilds when the rules change', () => {
  const entities = scatter(500)
  const first = clusterIndexFor(entities, RULES, byOwnId)
  expect(
    clusterIndexFor(entities, { ...RULES, minPoints: 3 }, byOwnId),
  ).not.toBe(first)
  expect(
    clusterIndexFor(entities, { ...RULES, zoomLevel: 12 }, byOwnId),
  ).not.toBe(first)
  expect(
    clusterIndexFor(entities, { ...RULES, forcedLimit: 50 }, byOwnId),
  ).not.toBe(first)
})

/*
 * The whole point of caching is that it changes nothing visible. This pins
 * the cached index's answers against the previous shape -- one throwaway
 * index per query -- across a plain zoom, a zoom past `zoomLevel` that
 * overflows into the coarsening descent, and the many-small-groups shape
 * that overflows for the other reason.
 */
test('a reused index answers exactly as a fresh one does', () => {
  for (const entities of [scatter(2000), groupsOf(800, 5)]) {
    const index = clusterIndexFor(entities, RULES, byOwnId)
    for (const zoom of [2, 8, 10, 14, 20]) {
      const cached = index.query(BOUNDS, zoom)
      const fresh = clusterEntities(entities, BOUNDS, zoom, RULES)
      expect(cached.points.map((entity) => entity.id)).toEqual(
        fresh.points.map((entity) => entity.id),
      )
      expect(cached.clusters).toEqual(fresh.clusters)
      expect(cached.limitHit).toBe(fresh.limitHit)
    }
  }
})

test('clusterIndexFor counts one build per entity set, not one per query', () => {
  const entities = scatter(500)
  const before = clusterIndexBuildCount()
  const index = clusterIndexFor(entities, RULES, byOwnId)
  index.query(BOUNDS, 10)
  index.query(BOUNDS, 14)
  clusterIndexFor(entities, RULES, byOwnId).query(BOUNDS, 16)
  expect(clusterIndexBuildCount() - before).toBe(1)
})
