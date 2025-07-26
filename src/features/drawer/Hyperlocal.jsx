// @ts-check
import * as React from 'react'

import { CollapsibleItem } from './components/CollapsibleItem'

function BaseHyperlocalDrawer({ subItem }) {
  return subItem === 'enabled' ? <CollapsibleItem /> : null
}

export const HyperlocalDrawer = React.memo(
  BaseHyperlocalDrawer,
  (prev, next) => prev.subItem === next.subItem,
)
