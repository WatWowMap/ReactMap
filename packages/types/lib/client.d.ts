import * as React from 'react'
import type {
  ButtonProps,
  FormControlProps,
  SxProps,
  Theme,
  SelectProps,
} from '@mui/material'
import type { SelectInputProps } from '@mui/material/Select/SelectInput'
import { SystemStyleObject } from '@mui/system'

import { UAssets } from '@services/Assets'
import { Config } from './config'
import {
  AdvCategories,
  BaseFilter,
  Categories,
  ObjectPathValue,
  Permissions,
  PokemonFilter,
} from '@rm/types'
import { UseStorage, UseStoragePaths } from '@store/useStorage'

declare global {
  declare const CONFIG: Config<true>

  interface Window {
    uicons?: UAssets
    uaudio?: UAssets
  }
}

export interface CustomI extends React.HTMLAttributes<HTMLLIElement> {
  size?: ButtonProps['size']
}

export type TimesOfDay = 'day' | 'night' | 'dawn' | 'dusk'

export type Theme = 'light' | 'dark'

export type TileLayer = {
  name: string
  style?: import('@rm/types').Theme
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

export interface MultiSelectorProps<V> {
  value: V
  items: readonly V[]
  tKey?: string
  disabled?: boolean
  onClick?: (
    oldValue: V,
    newValue: V,
  ) => (e?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
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

export type useGetDeepStore = <T extends UseStoragePaths>(
  field: T,
  defaultValue?: ObjectPathValue<UseStorage, T>,
) => ObjectPathValue<UseStorage, T>

export type useSetDeepStore = <T extends UseStoragePaths>(
  field: T,
  value: ObjectPathValue<UseStorage, T>,
) => void

export type useDeepStore = <
  T extends UseStoragePaths,
  U extends ObjectPathValue<UseStorage, T>,
  V extends U | ((prevValue: U) => U) | (U extends object ? keyof U : never),
>(
  field: T,
  defaultValue?: ObjectPathValue<UseStorage, T>,
) => [
  U,
  (arg1: V, ...rest: V extends keyof U ? [arg2: U[V]] : [arg2?: never]) => void,
]

export interface FCSelectProps<Value = unknown> extends SelectProps<Value> {
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
