import * as React from 'react'
import type { SxProps, BaseSelectProps } from '@mui/material'

import type { Config } from './config'
import type {
  AdvCategories,
  BaseFilter,
  Categories,
  Permissions,
  PokemonFilter,
} from './server'

declare global {
  const CONFIG: Config<true>
}

export type TimesOfDay = 'day' | 'night' | 'dawn' | 'dusk'

export type Theme = 'light' | 'dark'

export type TileLayer = {
  name: string
  style?: Theme
  attribution?: string
  url?: string
  background?: string
} & { [key in TimesOfDay]?: string }

export type MarginProps = {
  [Key in
    | 'm'
    | 'mt'
    | 'mb'
    | 'ml'
    | 'mr'
    | 'mx'
    | 'my']?: React.CSSProperties['margin']
}

export type PaddingProps = {
  [Key in
    | 'p'
    | 'pt'
    | 'pb'
    | 'pl'
    | 'pr'
    | 'px'
    | 'py']?: React.CSSProperties['padding']
}

export interface FilterObj {
  name: string
  perms: (keyof Permissions)[]
  webhookOnly?: boolean
  searchMeta?: string
  category?: AdvCategories
  pokedexId?: number
  formId?: number
  defaultFormId?: number
  pokeName?: string
  formName?: string
  formTypes?: string[]
  rarity?: string
  historic?: string
  legendary?: boolean
  mythical?: boolean
  ultraBeast?: boolean
  genId?: string
  family?: number
}

export type ClientFilterObj = Record<string, Record<string, FilterObj>>

export interface FCSelectProps<Value = unknown> extends BaseSelectProps<Value> {
  fcSx?: SxProps
  setWidth?: (width: number) => void
}

export interface FCSelectListItemProps<Value = unknown>
  extends FCSelectProps<Value> {
  icon?: React.ReactElement
}

export type ClientFilters<T extends Categories> = T extends 'pokemon'
  ? ClassToObjectType<PokemonFilter>
  : ClassToObjectType<BaseFilter>

type ClassToObjectType<T> = Partial<
  Omit<
    {
      [K in keyof T]: T[K]
    },
    keyof T extends infer K
      ? K extends keyof T
        ? T[K] extends Function
          ? K
          : never
        : never
      : never
  >
>
