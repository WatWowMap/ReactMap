// @ts-check
import * as React from 'react'
import { ActiveNests } from './ActiveNests'
import { NestSlider } from './AvgSlider'
import { NestQuickSelect } from './NestSelector'

function BaseNestDrawer({ subItem }) {
  switch (subItem) {
    case 'sliders':
      return <NestSlider />
    case 'pokemon':
      return <NestQuickSelect />
    case 'active':
      return <ActiveNests />
    default:
      return null
  }
}

export const NestsDrawer = React.memo(
  BaseNestDrawer,
  (prev, next) => prev.subItem === next.subItem,
)
