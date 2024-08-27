// @ts-check

import * as React from 'react'
import ListItem from '@mui/material/ListItem'

import { MultiSelectorStore } from '@components/inputs/MultiSelector'
import { useStorage } from '@store/useStorage'
import { CollapsibleItem } from '../components/CollapsibleItem'

const ITEMS = ['active', 'all', 'inactive']

export function ActiveNests() {
  const show = useStorage((s) => !!s.filters?.nests?.polygons)
  return (
    <CollapsibleItem open={show}>
      <ListItem>
        <MultiSelectorStore items={ITEMS} field="filters.nests.active" />
      </ListItem>
    </CollapsibleItem>
  )
}
