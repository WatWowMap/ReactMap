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
          height={175}
          label="search_lures"
          subCategory="lures"
        />
      </Box>
    </CollapsibleItem>
  )
}

export const LureQuickSelect = React.memo(BaseLureQuickSelect)
