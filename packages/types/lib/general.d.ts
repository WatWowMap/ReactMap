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
    domain?: string
    hidden?: boolean
    parent?: string
    manual?: boolean
    key: string
  }
>

export type RMGeoJSON = {
  type: 'FeatureCollection'
  features: RMFeature[]
}

import masterfile = require('packages/masterfile/lib/data/masterfile.json')

export type Masterfile = typeof masterfile

export type Strategy = 'discord' | 'telegram' | 'local'

export type S2Polygon = [number, number][]

export interface PoI {
  id: string
  lat: number
  lon: number
}

export interface BaseCell {
  id: string
  polygon: S2Polygon
}

export interface Level17Cell extends BaseCell {
  // level: 17
  blocked: boolean
}

export interface Level14Cell extends BaseCell {
  // level: 14
  count_pokestops: number
  count_gyms: number
}

export interface SubmissionCell {
  level17Cells: Level17Cell[]
  level14Cells: Level14Cell[]
  pois: PoI[]
}

export interface Bounds {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}
