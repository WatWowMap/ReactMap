// @ts-check
import * as React from 'react'
import Box from '@mui/material/Box'

import { useStorage } from '@store/useStorage'

import { CollapsibleItem } from '../CollapsibleItem'
import { SelectorListMemo } from '../SelectorList'

const BaseNestQuickSelect = () => {
  const enabled = useStorage((s) => !!s.filters?.nests?.pokemon)
  return (
    <CollapsibleItem open={enabled}>
      <Box px={2}>
        <SelectorListMemo category="nests" label="search_nests" height={350} />
      </Box>
    </CollapsibleItem>
  )
}

export const NestQuickSelect = React.memo(BaseNestQuickSelect)
