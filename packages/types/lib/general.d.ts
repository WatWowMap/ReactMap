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
    formattedName?: string
    zoom?: number
    center?: [number, number]
    key: string
  }
>

export type RMGeoJSON = {
  type: 'FeatureCollection'
  features: RMFeature[]
}

import masterfile = require('packages/masterfile/lib/data/masterfile.json')
import { Config } from './config'
import { SliderProps } from '@mui/material'

export type Masterfile = typeof masterfile

export type Strategy = 'discord' | 'telegram' | 'local'

export type S2Polygon = [number, number][]

export interface PoI {
  id: string
  lat: number
  lon: number
  showcase: boolean
  partner: boolean
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

export type ImageExt = 'jpg' | 'jpeg' | 'png' | 'gif' | 'webp'
export type UiconImage = `${string}.${ImageExt}`
export interface UICONS {
  device: UiconImage[]
  gym: UiconImage[]
  invasion: UiconImage[]
  misc: UiconImage[]
  nest: UiconImage[]
  pokemon: UiconImage[]
  pokestop: UiconImage[]
  raid: {
    egg: UiconImage[]
  }
  reward: {
    [
      key: Masterfile['questRewardTypes'][keyof Masterfile['questRewardTypes']]
    ]: UiconImage[]
  }
  spawnpoint: UiconImage[]
  team: UiconImage[]
  type: UiconImage[]
  weather: UiconImage[]
}

export type UAssetsClient = Config['icons']['styles'][number] & { data: UICONS }

export type FullClientIcons = Omit<Config['icons'], 'styles'> & {
  styles: (Config['icons']['styles'][number] & { data: UICONS })[]
}

export interface RMSlider extends SliderProps {
  label?: string
  perm?: string
  step?: number
  i18nKey?: string
  disabled?: boolean
  low?: number
  high?: number
  i18nKey?: string
  markI18n?: string
  noTextInput?: boolean
  marks?: number[]
}

export type RMSliderHandleChange<N extends string = string> = (
  name: N,
  values: number | number[],
) => void

export interface RMSliderProps {
  slide: RMSlider
  values: number[]
  handleChange: RMSliderHandleChange
}
