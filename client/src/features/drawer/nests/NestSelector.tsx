import * as React from 'react'
import Box from '@mui/material/Box'
import { useStorage } from '@store/useStorage'

import { CollapsibleItem } from '../components/CollapsibleItem'
import { SelectorListMemo } from '../components/SelectorList'

const BaseNestQuickSelect = () => {
  const enabled = useStorage((s) => !!s.filters?.nests?.pokemon)

  return (
    <CollapsibleItem open={enabled}>
      <Box px={2}>
        <SelectorListMemo category="nests" height={350} label="search_nests" />
      </Box>
    </CollapsibleItem>
  )
}

export const NestQuickSelect = React.memo(BaseNestQuickSelect)
