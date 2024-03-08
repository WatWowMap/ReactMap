// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'

import { useStorage } from '@store/useStorage'
import { ENUM_TTH } from '@assets/constants'
import { MultiSelectorStore } from '@components/inputs/MultiSelector'

import { CollapsibleItem } from './components/CollapsibleItem'

const SpawnpointTTH = () => {
  const enabled = useStorage((s) => !!s.filters?.spawnpoints?.enabled)
  return (
    <CollapsibleItem open={enabled}>
      <ListItem>
        <MultiSelectorStore
          field="filters.spawnpoints.tth"
          items={ENUM_TTH}
          tKey="tth_"
        />
      </ListItem>
    </CollapsibleItem>
  )
}

function AdminComponent({ subItem }) {
  return subItem === 'spawnpoints' ? <SpawnpointTTH /> : null
}

export const AdminDrawer = React.memo(
  AdminComponent,
  (prev, next) => prev.subItem === next.subItem,
)
