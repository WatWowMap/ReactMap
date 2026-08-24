// @ts-check
import * as React from 'react'
import { AdminDrawer } from './Admin'
import { GymDrawer } from './gyms'
import { NestsDrawer } from './nests'
import { PokestopDrawer } from './pokestops'
import { RoutesDrawer } from './Routes'
import { S2CellsDrawer } from './S2Cells'
import { StationsDrawer } from './Stations'
import { TappablesDrawer } from './Tappables'
import { WayfarerDrawer } from './Wayfarer'

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
    case 'stations':
      return subItem === 'maxBattles' && <StationsDrawer />
    case 'tappables':
      return <TappablesDrawer />
    default:
      return null
  }
}

export const Extras = React.memo(
  ExtrasComponent,
  (prev, next) =>
    prev.category === next.category && prev.subItem === next.subItem,
)
