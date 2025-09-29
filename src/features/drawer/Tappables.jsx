// @ts-check
import * as React from 'react'

import { useStorage } from '@store/useStorage'

import { CollapsibleItem } from './components/CollapsibleItem'
import { SelectorListMemo } from './components/SelectorList'

const BaseTappablesDrawer = () => {
  const enabled = useStorage((s) => !!s.filters?.tappables?.enabled)

  return (
    <CollapsibleItem open={enabled}>
      <SelectorListMemo category="tappables" label="tappables" height={350} />
    </CollapsibleItem>
  )
}

export const TappablesDrawer = React.memo(BaseTappablesDrawer)
