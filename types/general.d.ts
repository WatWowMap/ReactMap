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

import masterfile = require('../server/src/data/masterfile.json')

export type Masterfile = typeof masterfile

export type Strategy = 'discord' | 'telegram' | 'local'
