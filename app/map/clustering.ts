import Supercluster from 'supercluster'
import type { Bounds } from './types'

/**
 * Ported from 1.0's `config/default.json` `clustering` block
 * (`src/pages/map/components/Clustering.jsx` line 72 for the shape).
 * `zoomLevel` is the zoom above which supercluster stops clustering and
 * hands back raw points; `forcedLimit` is the hard cap on how many
 * markers may render at once for the category.
 */
export interface ClusterRules {
  zoomLevel: number
  forcedLimit: number
  minPoints: number
}

/** From `config/default.json`'s `clustering` block. */
export const DEFAULT_POKEMON_CLUSTER_RULES: ClusterRules = {
  zoomLevel: 15,
  forcedLimit: 3000,
  minPoints: 7,
}

export const DEFAULT_GYM_CLUSTER_RULES: ClusterRules = {
  zoomLevel: 13,
  forcedLimit: 2500,
  minPoints: 5,
}

/**
 * The minimum an index needs from an entity: where it is. Identity comes
 * from an `idOf` the caller supplies, so a pokemon keyed by `spawnId` and a
 * gym keyed by `gymId` both go in as they are, with no per-call wrapper
 * array in between.
 */
export interface ClusterPoint {
  lat: number
  lon: number
}

/** A `ClusterPoint` that carries its own id, which `clusterEntities` uses. */
export interface ClusterableEntity extends ClusterPoint {
  id: string
}

/** A synthetic marker standing in for `count` entities too close together to render individually. */
export interface ClusterMarker {
  kind: 'cluster'
  id: string
  lat: number
  lon: number
  count: number
}

export interface ClusterResult<T extends ClusterPoint> {
  /** Individual entities to render as their own markers. */
  points: readonly T[]
  /** Synthetic cluster markers, each standing in for several entities. */
  clusters: readonly ClusterMarker[]
  /**
   * True when `rules.forcedLimit` was exceeded and the rendered set had to
   * be capped. The caller should show this, not just cap silently - see
   * clustering.test.ts and the task brief for why a silent cap is worse
   * than a visible one.
   */
  limitHit: boolean
}

function toFeature(
  entity: ClusterPoint,
  id: string,
): {
  type: 'Feature'
  id: string
  properties: Record<string, never>
  geometry: { type: 'Point'; coordinates: [number, number] }
} {
  return {
    type: 'Feature',
    id,
    properties: {},
    geometry: { type: 'Point', coordinates: [entity.lon, entity.lat] },
  }
}

interface Rendered<T> {
  clusters: ClusterMarker[]
  points: T[]
}

/**
 * Last-resort cap for when even zoom 0 will not fit: keep the markers
 * standing for the most entities. A cluster covers at least `minPoints`
 * entities and a loose point covers one, so clusters by descending count come
 * first and points fill whatever budget is left. This maximises how much of
 * the data is still represented on screen, which is the only defensible
 * ordering when something genuinely has to go.
 */
function keepDensest<T>(rendered: Rendered<T>, limit: number): Rendered<T> {
  const clusters = [...rendered.clusters]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
  return {
    clusters,
    points: rendered.points.slice(0, Math.max(0, limit - clusters.length)),
  }
}

/** One index over one entity set, queryable at any viewport and zoom. */
export interface ClusterIndex<T extends ClusterPoint> {
  /**
   * Clusters the indexed entities for one viewport/zoom and enforces
   * `rules.forcedLimit` as a hard cap on the total rendered set - clusters
   * plus loose points - independent of zoom. See `createClusterIndex` for
   * what the cap does and why.
   */
  query(bounds: Bounds, zoom: number): ClusterResult<T>
}

let buildCount = 0

/**
 * How many indexes have been built this session. Instrumentation for the
 * tests that pin "a pan is a query, not a rebuild"; nothing reads it at
 * runtime.
 */
export function clusterIndexBuildCount(): number {
  return buildCount
}

/**
 * Builds the spatial index over `entities` once, so that panning can be a
 * query rather than a rebuild.
 *
 * supercluster's `load` constructs a KD-tree per zoom level precisely so
 * that `getClusters` is a cheap range scan afterwards. Measured on this
 * machine, build+load against one query: 2.3ms/0.15ms at 500 entities,
 * 2.7ms/0.02ms at 2000, 4.8ms/0.09ms at 7000 - 16x to 119x. An index built
 * per query pays for the whole tree and then uses it once, which is what
 * this API exists to stop. Use `clusterIndexFor` to get one that survives a
 * camera move.
 *
 * `rules.zoomLevel` and `rules.minPoints` are constructor arguments, so a
 * rules change means a new index; only `forcedLimit` is read per query.
 *
 * supercluster's `maxZoom` is the zoom ABOVE WHICH it stops clustering and
 * returns raw, unclustered points - it is not a bound on how many markers
 * come back. 1.0 built its clusterer with `maxZoom: rules.zoomLevel` and
 * relied on that same clusterer to keep the count under `forcedLimit`
 * (`src/pages/map/components/Clustering.jsx` lines 92-98, 157). Above
 * `zoomLevel` - exactly where the most markers are on screen - supercluster
 * stops clustering, so every entity in view comes back individually and
 * nothing enforces the limit any more.
 *
 * An earlier pass at this capped only `points`, against a budget of
 * `forcedLimit - clusters.length`, which binds for a uniformly scattered
 * map and for nothing else. Give it many well-separated small groups - a
 * country of small towns with a few gyms each - and every group survives as
 * its own cluster, the point budget is zero before any capping happens, and
 * the cluster count runs unbounded. Measured at gym rules with 3500 groups
 * of 5, zooms 8, 10 and 13 each rendered 3500 markers against a limit of
 * 2500.
 *
 * The cap is on the total, and it is applied by COARSENING rather than by
 * dropping markers: if the count at the requested zoom does not fit, the
 * same index is queried at successively lower zooms until it does. Every
 * entity in view is then still standing behind some marker, just a bigger
 * one, which is the property that separates a decluttered map from a map
 * that has silently deleted a third of its towns. Dropping the smallest
 * clusters would have made whole regions vanish with nothing on screen
 * saying so, and truncating an arbitrary slice is worse again.
 *
 * Only if even zoom 0 does not fit does anything get dropped, and then the
 * markers kept are the ones standing for the most entities (see
 * `keepDensest`). That path needs a `forcedLimit` smaller than the number of
 * clusters the whole world collapses to, so in practice it is a guard, not a
 * behaviour.
 */
export function createClusterIndex<T extends ClusterPoint>(
  entities: readonly T[],
  rules: ClusterRules,
  idOf: (entity: T) => string,
): ClusterIndex<T> {
  buildCount += 1
  const index = new Supercluster({
    radius: 60,
    extent: 256,
    maxZoom: rules.zoomLevel,
    minPoints: rules.minPoints,
  })
  // Both of these allocate per entity, which is why they belong here, on the
  // build path, and not on the query path a pan runs.
  index.load(entities.map((entity) => toFeature(entity, idOf(entity))))
  const byId = new Map(entities.map((entity) => [idOf(entity), entity]))

  const collect = (
    bbox: [number, number, number, number],
    at: number,
  ): Rendered<T> => {
    const clusters: ClusterMarker[] = []
    const points: T[] = []
    for (const feature of index.getClusters(bbox, at)) {
      const [lon, lat] = feature.geometry.coordinates
      const properties = feature.properties
      if (properties.cluster === true) {
        clusters.push({
          kind: 'cluster',
          id: `cluster-${feature.id}`,
          lat,
          lon,
          count: properties.point_count as number,
        })
      } else if (feature.id !== undefined) {
        const entity = byId.get(String(feature.id))
        if (entity) points.push(entity)
      }
    }
    return { clusters, points }
  }

  /**
   * The last answer, and the camera it answered for.
   *
   * Two queries for the same camera are the same answer, and deck.gl
   * cares that they are the same ARRAYS: it re-uploads a layer's buffers
   * whenever `data` changes identity. The caller rebuilds both
   * categories' layers whenever either category changes, so without this
   * a pokemon expiring handed the gym layer fresh arrays for a gym set
   * that had not moved -- which is exactly the re-upload `entity-store.ts`
   * keeps its two arrays apart to avoid.
   *
   * Keyed on the bounds' VALUES, because the caller reads a fresh
   * `Bounds` off the map on every `moveend`; an identity key would never
   * hit. One entry, not an LRU: the map has one camera, and a second
   * entry would only ever be the one it just left.
   */
  let last: { key: string; result: ClusterResult<T> } | null = null

  return {
    query(bounds, zoom) {
      const key = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}@${zoom}`
      if (last && last.key === key) return last.result

      const bbox: [number, number, number, number] = [
        bounds.west,
        bounds.south,
        bounds.east,
        bounds.north,
      ]
      const remember = (result: ClusterResult<T>): ClusterResult<T> => {
        last = { key, result }
        return result
      }
      const fits = (rendered: Rendered<T>) =>
        rendered.clusters.length + rendered.points.length <= rules.forcedLimit

      const requested = Math.round(zoom)
      const first = collect(bbox, requested)
      if (fits(first)) return remember({ ...first, limitHit: false })

      // Everything above `zoomLevel` returns the same unclustered set, so the
      // descent starts at `zoomLevel` rather than walking those zooms one by
      // one to get the identical answer each time.
      let coarsest = first
      for (
        let at = Math.min(requested - 1, rules.zoomLevel);
        at >= 0;
        at -= 1
      ) {
        coarsest = collect(bbox, at)
        if (fits(coarsest)) return remember({ ...coarsest, limitHit: true })
      }

      return remember({
        ...keepDensest(coarsest, rules.forcedLimit),
        limitHit: true,
      })
    },
  }
}

interface CachedIndex {
  rules: ClusterRules
  idOf: unknown
  index: ClusterIndex<ClusterPoint>
}

/**
 * Keyed on the entity array's identity, which is the thing that actually
 * says whether the indexed set changed. `entity-store.ts` keeps each
 * category's array stable across renders that changed nothing, so a pan
 * hits this every time. Weak so an array that has been replaced takes its
 * index with it.
 */
const indexCache = new WeakMap<object, CachedIndex>()

function sameRules(a: ClusterRules, b: ClusterRules): boolean {
  return (
    a.zoomLevel === b.zoomLevel &&
    a.minPoints === b.minPoints &&
    a.forcedLimit === b.forcedLimit
  )
}

/**
 * The index for this entity set, built on first ask and reused afterwards.
 *
 * This is the whole fix for "every pan rebuilds the entire spatial index":
 * the caller may hold a viewport in its memo deps, and a camera move then
 * costs a `query` rather than a `load`. A new entity array, new rules, or a
 * new `idOf` is a new index; nothing else is.
 *
 * Note what this does NOT do: it does not memoize query RESULTS. Each
 * `query` returns fresh arrays, so a caller feeding deck.gl must keep its
 * own memo around the call - handing deck.gl a new `data` reference every
 * render would trade an index rebuild for a GPU buffer upload, which is the
 * worse of the two.
 */
export function clusterIndexFor<T extends ClusterPoint>(
  entities: readonly T[],
  rules: ClusterRules,
  idOf: (entity: T) => string,
): ClusterIndex<T> {
  const cached = indexCache.get(entities)
  if (cached && cached.idOf === idOf && sameRules(cached.rules, rules)) {
    // Safe: the cache is keyed on this exact array, so the index in it was
    // built from these entities and hands them straight back out.
    return cached.index as ClusterIndex<T>
  }
  const index = createClusterIndex(entities, rules, idOf)
  indexCache.set(entities, { rules, idOf, index })
  return index
}

/**
 * Clusters `entities` for one viewport/zoom against a one-shot index.
 *
 * Convenience for callers with no set to keep an index for - tests, and any
 * one-off query. A caller that pans must go through `clusterIndexFor`
 * instead, or it pays a full rebuild per camera move.
 */
export function clusterEntities<T extends ClusterableEntity>(
  entities: readonly T[],
  bounds: Bounds,
  zoom: number,
  rules: ClusterRules,
): ClusterResult<T> {
  return createClusterIndex(entities, rules, (entity) => entity.id).query(
    bounds,
    zoom,
  )
}
