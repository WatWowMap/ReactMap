// @ts-check
import * as React from 'react'

import { AllForts } from '../components/AllForts'
import { EventsQuickSelect } from './EventStops'
import { InvasionQuickSelect } from './Invasions'
import { LureQuickSelect } from './Lures'
import { QuestQuickSelect } from './Quests'

function ExtrasComponent({ subItem }) {
  switch (subItem) {
    case 'allPokestops':
      return <AllForts category="pokestops" subItem={subItem} />
    case 'quests':
      return <QuestQuickSelect />
    case 'invasions':
      return <InvasionQuickSelect />
    case 'eventStops':
      return <EventsQuickSelect />
    case 'lures':
      return <LureQuickSelect />
    default:
      return null
  }
}

export const PokestopDrawer = React.memo(
  ExtrasComponent,
  (prev, next) => prev.subItem === next.subItem,
)
