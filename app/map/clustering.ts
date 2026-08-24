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

/**
 * Clusters `entities` for one viewport/zoom and enforces `rules.forcedLimit`
 * as a hard cap on the rendered set, independent of zoom.
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
 * This keeps `maxZoom: rules.zoomLevel` (the configured "zoom in to
 * declutter" behaviour is still worth having below that zoom) but then
 * caps the combined cluster+point count against `forcedLimit` itself,
 * after clustering runs, so the bound holds at every zoom rather than only
 * while supercluster is still willing to cluster. Clusters are kept in
 * full and loose points are truncated first, since a cluster already
 * represents many entities in one cheap marker.
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
  const raw = index.getClusters(bbox, Math.round(zoom))

  const byId = new Map(entities.map((entity) => [entity.id, entity]))
  const clusters: ClusterMarker[] = []
  const points: T[] = []
  for (const feature of raw) {
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

  const rendered = clusters.length + points.length
  if (rendered <= rules.forcedLimit) {
    return { points, clusters, limitHit: false }
  }

  const pointBudget = Math.max(0, rules.forcedLimit - clusters.length)
  return {
    points: points.slice(0, pointBudget),
    clusters,
    limitHit: true,
  }
}
