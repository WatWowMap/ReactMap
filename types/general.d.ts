import type { Feature, Polygon, MultiPolygon } from '@turf/helpers'

export type HttpMethod = 'GET' | 'PUT' | 'POST' | 'PATCH' | 'DELETE'

export type RMFeature = Feature<Polygon | MultiPolygon, { name: string }>

export type RMGeoJSON = {
  type: 'FeatureCollection'
  features: RMFeature[]
}
