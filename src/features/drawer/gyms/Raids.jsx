// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { useStorage, useDeepStore } from '@store/useStorage'
import { FCSelect } from '@components/inputs/FCSelect'

import { CollapsibleItem } from '../components/CollapsibleItem'
import { MultiSelectorList, SelectorListMemo } from '../components/SelectorList'

const RaidOverride = () => {
  const { t } = useTranslation()
  const available = useMemory((s) => s.available.gyms)
  const enabled = useStorage((s) => !!s.filters?.gyms?.raids)
  const [filters, setFilters] = useDeepStore('filters.gyms.raidTier', 'all')
  return (
    <CollapsibleItem open={enabled}>
      <ListItem
        secondaryAction={
          <FCSelect
            value={filters}
            fullWidth
            size="small"
            onChange={(e) =>
              setFilters(e.target.value === 'all' ? 'all' : +e.target.value)
            }
          >
            {[
              'all',
              ...available
                .filter((x) => x.startsWith('r'))
                .map((y) => +y.slice(1)),
            ].map((tier, i) => (
              <MenuItem key={tier} dense value={tier}>
                {t(i ? `raid_${tier}_plural` : 'disabled')}
              </MenuItem>
            ))}
          </FCSelect>
        }
      >
        <ListItemText primary={t('raid_override')} />
      </ListItem>
    </CollapsibleItem>
  )
}

const RaidQuickSelect = () => {
  const enabled = useStorage(
    (s) => !!(s.filters?.gyms?.raids && s.filters?.gyms?.raidTier === 'all'),
  )
  return (
    <CollapsibleItem open={enabled}>
      <MultiSelectorList tabKey="raids">
        <SelectorListMemo
          key="eggs"
          category="gyms"
          subCategory="raids"
          label="search_eggs"
          height={350}
        />
        <SelectorListMemo
          key="raids"
          category="gyms"
          subCategory="pokemon"
          label="search_raids"
          height={350}
        />
      </MultiSelectorList>
    </CollapsibleItem>
  )
}

const BaseRaids = () => (
  <>
    <RaidOverride />
    <RaidQuickSelect />
  </>
)

export const Raids = React.memo(BaseRaids)
