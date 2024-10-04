import * as React from 'react'
import Box from '@mui/material/Box'
import { useMemory } from '@store/useMemory'
import { useStorage } from '@store/useStorage'
import { BoolToggle } from '@components/inputs/BoolToggle'

import { CollapsibleItem } from '../components/CollapsibleItem'
import { MultiSelectorList, SelectorListMemo } from '../components/SelectorList'

const BaseInvasion = () => {
  const enabled = useStorage((s) => !!s.filters?.pokestops?.invasions)
  const hasConfirmed = useMemory((s) =>
    s.available.pokestops.some((x) => x.startsWith('a')),
  )
  const confirmedEnabled = useStorage((s) => !!s.filters?.pokestops?.confirmed)

  return (
    <CollapsibleItem open={enabled}>
      {(confirmedEnabled || hasConfirmed) && (
        <BoolToggle
          inset
          field="filters.pokestops.confirmed"
          label="only_confirmed"
        />
      )}
      <BoolToggle
        inset
        field="filters.pokestops.excludeGrunts"
        label="only_exclude_grunts"
      />
      <BoolToggle
        inset
        field="filters.pokestops.excludeLeaders"
        label="only_exclude_leaders"
      />
      {confirmedEnabled || hasConfirmed ? (
        <MultiSelectorList tabKey="invasions">
          <SelectorListMemo
            key="invasions"
            category="pokestops"
            height={350}
            label="search_invasions"
            subCategory="invasions"
          />
          <SelectorListMemo
            key="rocket_pokemon"
            category="pokestops"
            height={350}
            label="search_rocket_pokemon"
            subCategory="rocketPokemon"
          />
        </MultiSelectorList>
      ) : (
        <Box px={2}>
          <SelectorListMemo
            key="invasions"
            category="pokestops"
            height={350}
            label="search_invasions"
            subCategory="invasions"
          />
        </Box>
      )}
    </CollapsibleItem>
  )
}

export const InvasionQuickSelect = React.memo(BaseInvasion)
