// @ts-check
import * as React from 'react'
import Box from '@mui/material/Box'

import { useStorage } from '@store/useStorage'

import { CollapsibleItem } from '../components/CollapsibleItem'
import { SelectorListMemo } from '../components/SelectorList'

const BaseLureQuickSelect = () => {
  const enabled = useStorage((s) => !!s.filters?.pokestops?.lures)
  return (
    <CollapsibleItem open={enabled}>
      <Box px={2}>
        <SelectorListMemo
          category="pokestops"
          subCategory="lures"
          label="search_lures"
          height={175}
        />
      </Box>
    </CollapsibleItem>
  )
}
export const LureQuickSelect = React.memo(BaseLureQuickSelect)
