// @ts-check
import * as React from 'react'

import { PokestopDrawer } from './pokestops'
import { GymDrawer } from './gyms'
import { NestsDrawer } from './nests'
import { RoutesDrawer } from './Routes'
import { WayfarerDrawer } from './Wayfarer'
import { S2CellsDrawer } from './S2Cells'
import { AdminDrawer } from './Admin'

function ExtrasComponent({ category, subItem }) {
  switch (category) {
    case 'nests':
      return <NestsDrawer subItem={subItem} />
    case 's2cells':
      return <S2CellsDrawer subItem={subItem} />
    case 'pokestops':
      return <PokestopDrawer subItem={subItem} />
    case 'gyms':
      return <GymDrawer subItem={subItem} />
    case 'wayfarer':
      return <WayfarerDrawer subItem={subItem} />
    case 'routes':
      return <RoutesDrawer subItem={subItem} />
    case 'admin':
      return <AdminDrawer subItem={subItem} />
    default:
      return null
  }
}

export const Extras = React.memo(
  ExtrasComponent,
  (prev, next) =>
    prev.category === next.category && prev.subItem === next.subItem,
)
