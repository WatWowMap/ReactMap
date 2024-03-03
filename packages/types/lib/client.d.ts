import * as React from 'react'
import type { ButtonProps, SxProps, Theme } from '@mui/material'
import { SystemStyleObject } from '@mui/system'

import UAssets from '@services/Assets'
import { Config } from './config'

declare global {
  declare const CONFIG: Config<true>

  interface Window {
    uicons?: UAssets
    uaudio?: UAssets
  }
}

export interface CustomI extends React.HTMLProps<HTMLLIElement> {
  size?: ButtonProps['size']
}

export type TimesOfDay = 'day' | 'night' | 'dawn' | 'dusk'

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
