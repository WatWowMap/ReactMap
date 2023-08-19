import * as React from 'react'
import { Config } from './config'

declare global {
  declare const CONFIG: Config<true>
}

export interface CustomI extends React.HTMLProps<HTMLLIElement> {
  size?: 'small' | 'medium'
}
