import * as React from 'react'
import { Config } from './config'
import UAssets from '@services/Icons'
import { ButtonProps } from '@mui/material'

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
