import * as React from 'react'
import { Config } from './config'
import UIcons from '@services/Icons'
import { ButtonProps } from '@mui/material'

declare global {
  declare const CONFIG: Config<true>

  interface Window {
    uicons?: UIcons
  }
}

export interface CustomI extends React.HTMLProps<HTMLLIElement> {
  size?: ButtonProps['size']
}
