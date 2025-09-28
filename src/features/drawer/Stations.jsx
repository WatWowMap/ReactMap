// @ts-check
import * as React from 'react'
import Box from '@mui/material/Box'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'
import { useMemory } from '@store/useMemory'
import { useDeepStore, useStorage, setDeepStore } from '@store/useStorage'
import { FCSelect } from '@components/inputs/FCSelect'
import { BoolToggle } from '@components/inputs/BoolToggle'

import { CollapsibleItem } from './components/CollapsibleItem'
import { SelectorListMemo } from './components/SelectorList'

function StationsNestedInactive() {
  const allEnabled = useStorage((s) => !!s.filters?.stations?.allStations)
  const maxBattles = useStorage((s) => !!s.filters?.stations?.maxBattles)
  const gmax = useStorage((s) => !!s.filters?.stations?.gmaxStationed)

  // Render a nested toggle that appears only when All Power Spots is enabled
  return (
    <CollapsibleItem open={allEnabled}>
      <BoolToggle
        inset
        field="filters.stations.inactiveStations"
        label="inactive_stations"
        onChange={(_, checked) => {
          // Atomically turn off battle toggles first, then enable inactive to avoid first-click race
          if (checked) {
            if (maxBattles) setDeepStore('filters.stations.maxBattles', false)
            if (gmax) setDeepStore('filters.stations.gmaxStationed', false)
          }
          setDeepStore('filters.stations.inactiveStations', checked)
        }}
      />
    </CollapsibleItem>
  )
}

function StationsEffects() {
  const maxBattles = useStorage((s) => !!s.filters?.stations?.maxBattles)
  const gmax = useStorage((s) => !!s.filters?.stations?.gmaxStationed)
  const inactive = useStorage((s) => !!s.filters?.stations?.inactiveStations)

  React.useEffect(() => {
    if (inactive) {
      if (maxBattles) setDeepStore('filters.stations.maxBattles', false)
      if (gmax) setDeepStore('filters.stations.gmaxStationed', false)
    }
  }, [inactive])

  const prev = React.useRef({ maxBattles, gmax })
  React.useEffect(() => {
    const wasOn = prev.current.maxBattles || prev.current.gmax
    const nowOn = maxBattles || gmax
    if (!wasOn && nowOn && inactive) {
      setDeepStore('filters.stations.inactiveStations', false)
    }
    prev.current = { maxBattles, gmax }
  }, [maxBattles, gmax, inactive])

  return null
}

function StationLevels() {
  const { t } = useTranslation()
  const available = useMemory((s) => s.available.stations)
  const enabled = useStorage(
    (s) =>
      !!s.filters?.stations?.maxBattles && !s.filters?.stations?.allStations,
  )
  const [filters, setFilters] = useDeepStore(
    'filters.stations.battleTier',
    'all',
  )
  return (
    <CollapsibleItem open={enabled}>
      <ListItem
        secondaryAction={
          <FCSelect
            value={filters}
            fullWidth
            size="small"
            onChange={(e) =>
              setFilters(e.target.value === 'all' ? 'all' : e.target.value)
            }
          >
            {[
              'all',
              ...available
                .filter((x) => x.startsWith('j'))
                .map((y) => +y.slice(1)),
            ].map((tier, i) => (
              <MenuItem key={tier} dense value={tier}>
                {t(i ? `max_battle_${tier}_plural` : 'disabled')}
              </MenuItem>
            ))}
          </FCSelect>
        }
      >
        <ListItemText primary={t('override')} />
      </ListItem>
    </CollapsibleItem>
  )
}

function StationsQuickSelect() {
  const enabled = useStorage(
    (s) =>
      !!s.filters?.stations?.maxBattles &&
      s.filters?.stations?.battleTier === 'all' &&
      !s.filters?.stations?.allStations,
  )
  return (
    <CollapsibleItem open={enabled}>
      <Box px={2}>
        <SelectorListMemo
          category="stations"
          label="search_battles"
          height={350}
        />
      </Box>
    </CollapsibleItem>
  )
}

export function StationsDrawer({ subItem }) {
  return (
    <>
      <StationsEffects />
      {subItem === 'allStations' && <StationsNestedInactive />}
      {subItem === 'maxBattles' && (
        <>
          <StationLevels />
          <StationsQuickSelect />
        </>
      )}
    </>
  )
}
