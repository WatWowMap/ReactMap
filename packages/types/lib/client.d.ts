import * as React from 'react'
import { Config } from './config'
import UAssets from '@services/Icons'
import { ButtonProps, SxProps, Theme } from '@mui/material'
import { SystemStyleObject } from '@mui/system'

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
  [Key in 'm' | 'mt' | 'mb' | 'ml' | 'mr']?: React.CSSProperties['margin']
}

export type PaddingProps = {
  [Key in 'p' | 'pt' | 'pb' | 'pl' | 'pr']?: React.CSSProperties['padding']
}
