import * as React from 'react'
import { Config } from './config'
import UIcons from '@services/Icons'

declare global {
  declare const CONFIG: Config<true>

  interface Window {
    uicons?: UIcons
  }
}

export interface CustomI extends React.HTMLProps<HTMLLIElement> {
  size?: 'small' | 'medium'
}
