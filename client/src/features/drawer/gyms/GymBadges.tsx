// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'

import { useStorage } from '@store/useStorage'
import { BADGES } from '@assets/constants'
import { MultiSelectorStore } from '@components/inputs/MultiSelector'

import { CollapsibleItem } from '../components/CollapsibleItem'

const BaseGymBadges = () => {
  const enabled = useStorage((s) => !!s.filters?.gyms?.gymBadges)
  return (
    <CollapsibleItem open={enabled}>
      <ListItem>
        <MultiSelectorStore
          field="filters.gyms.badge"
          allowNone
          items={BADGES}
        />
      </ListItem>
    </CollapsibleItem>
  )
}

export const GymBadges = React.memo(BaseGymBadges)
