import type { Feature, Polygon, MultiPolygon } from '@turf/helpers'

export type HttpMethod = 'GET' | 'PUT' | 'POST' | 'PATCH' | 'DELETE'

export type RMFeature = Feature<
  Polygon | MultiPolygon,
  {
    name: string
    userSelectable?: boolean
    description?: string
    displayInMatches?: boolean
    color?: string
    group?: string
  }
>

export type RMGeoJSON = {
  type: 'FeatureCollection'
  features: RMFeature[]
}
