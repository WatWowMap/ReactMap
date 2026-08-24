/**
 * `supercluster` ships no types and there is no `@types/supercluster` in
 * this project. This declares only the surface `clustering.ts` actually
 * calls, typed to what supercluster's README documents, so the dependency
 * does not force `any` through strict TypeScript.
 */
declare module 'supercluster' {
  export interface SuperclusterOptions {
    /** Cluster radius, in pixels. Default 40. */
    radius?: number
    /** Tile extent, radius is relative to this. Default 512. */
    extent?: number
    /** Min zoom to generate clusters at. Default 0. */
    minZoom?: number
    /** Max zoom level at which clusters are generated. Above it, `getClusters` returns raw points. Default 16. */
    maxZoom?: number
    /** Minimum points to form a cluster. Default 2. */
    minPoints?: number
  }

  export interface SuperclusterPointFeature {
    type: 'Feature'
    id?: string | number
    properties: Record<string, unknown>
    geometry: { type: 'Point'; coordinates: [number, number] }
  }

  export interface SuperclusterClusterProperties {
    cluster: true
    cluster_id: number
    point_count: number
    point_count_abbreviated: string | number
  }

  export type SuperclusterFeature = SuperclusterPointFeature

  export default class Supercluster {
    constructor(options?: SuperclusterOptions)
    load(points: SuperclusterPointFeature[]): this
    getClusters(
      bbox: [number, number, number, number],
      zoom: number,
    ): SuperclusterFeature[]
  }
}
