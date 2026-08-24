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

export interface ClusterableEntity {
  id: string
  lat: number
  lon: number
}

/** A synthetic marker standing in for `count` entities too close together to render individually. */
export interface ClusterMarker {
  kind: 'cluster'
  id: string
  lat: number
  lon: number
  count: number
}

export interface ClusterResult<T extends ClusterableEntity> {
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

function toFeature(entity: ClusterableEntity): {
  type: 'Feature'
  id: string
  properties: Record<string, never>
  geometry: { type: 'Point'; coordinates: [number, number] }
} {
  return {
    type: 'Feature',
    id: entity.id,
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

/**
 * Clusters `entities` for one viewport/zoom and enforces `rules.forcedLimit`
 * as a hard cap on the total rendered set - clusters plus loose points -
 * independent of zoom.
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
 * The cap here is on the total, and it is applied by COARSENING rather than
 * by dropping markers: if the count at the requested zoom does not fit, the
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
export function clusterEntities<T extends ClusterableEntity>(
  entities: readonly T[],
  bounds: Bounds,
  zoom: number,
  rules: ClusterRules,
): ClusterResult<T> {
  const index = new Supercluster({
    radius: 60,
    extent: 256,
    maxZoom: rules.zoomLevel,
    minPoints: rules.minPoints,
  })
  index.load(entities.map(toFeature))

  const bbox: [number, number, number, number] = [
    bounds.west,
    bounds.south,
    bounds.east,
    bounds.north,
  ]
  const byId = new Map(entities.map((entity) => [entity.id, entity]))

  const collect = (at: number): Rendered<T> => {
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

  const fits = (rendered: Rendered<T>) =>
    rendered.clusters.length + rendered.points.length <= rules.forcedLimit

  const requested = Math.round(zoom)
  const first = collect(requested)
  if (fits(first)) return { ...first, limitHit: false }

  // Everything above `zoomLevel` returns the same unclustered set, so the
  // descent starts at `zoomLevel` rather than walking those zooms one by one
  // to get the identical answer each time.
  let coarsest = first
  for (let at = Math.min(requested - 1, rules.zoomLevel); at >= 0; at -= 1) {
    coarsest = collect(at)
    if (fits(coarsest)) return { ...coarsest, limitHit: true }
  }

  return { ...keepDensest(coarsest, rules.forcedLimit), limitHit: true }
}
