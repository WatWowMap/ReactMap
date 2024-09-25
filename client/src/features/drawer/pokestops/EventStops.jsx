// @ts-check
import * as React from 'react'
import Box from '@mui/material/Box'

import { useStorage } from '@store/useStorage'

import { CollapsibleItem } from '../components/CollapsibleItem'
import { SelectorListMemo } from '../components/SelectorList'

const BaseEventsQuickSelect = () => {
  const enabled = useStorage((s) => !!s.filters?.pokestops?.eventStops)
  return (
    <CollapsibleItem open={enabled}>
      <Box px={2}>
        <SelectorListMemo
          category="pokestops"
          subCategory="showcase"
          height={175}
        />
      </Box>
    </CollapsibleItem>
  )
}

export const EventsQuickSelect = React.memo(BaseEventsQuickSelect)
