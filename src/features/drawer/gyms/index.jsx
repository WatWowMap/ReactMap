// @ts-check
import * as React from 'react'

import { AllForts } from '../AllForts'
import { GymBadges } from './GymBadges'
import { Raids } from './Raids'

function ExtrasComponent({ subItem }) {
  switch (subItem) {
    case 'allGyms':
      return <AllForts category="gyms" subItem={subItem} />
    case 'gymBadges':
      return <GymBadges />
    case 'raids':
      return <Raids />
    default:
      return null
  }
}

export const GymDrawer = React.memo(
  ExtrasComponent,
  (prev, next) => prev.subItem === next.subItem,
)
