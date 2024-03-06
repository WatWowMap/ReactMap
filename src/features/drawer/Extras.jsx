// @ts-check
/* eslint-disable no-fallthrough */
/* eslint-disable default-case */
import * as React from 'react'
import Box from '@mui/material/Box'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { useStorage, useDeepStore } from '@store/useStorage'
import { S2_LEVELS, ENUM_TTH, WAYFARER_OPTIONS } from '@assets/constants'
import { SliderTile } from '@components/inputs/SliderTile'
import { MultiSelectorStore } from '@components/inputs/MultiSelector'
import { BoolToggle } from '@components/inputs/BoolToggle'
import { FCSelectListItem } from '@components/inputs/FCSelect'

import { CollapsibleItem } from './CollapsibleItem'
import { SelectorListMemo } from './SelectorList'
import { PokestopDrawer } from './pokestops'
import { GymDrawer } from './gyms'

const BaseNestSlider = () => {
  const slider = useMemory((s) => s.ui.nests?.sliders?.secondary?.[0])
  const [filters, setFilters] = useDeepStore(`filters.nests.avgFilter`)
  if (!filters || !slider) return null
  return (
    <ListItem>
      <SliderTile
        slide={slider}
        handleChange={(_, values) => setFilters(values)}
        values={filters}
      />
    </ListItem>
  )
}
const NestSlider = React.memo(BaseNestSlider)

const BaseS2Cells = () => {
  const { t } = useTranslation()
  const enabled = useStorage((s) => !!s.filters.s2cells.enabled)
  const [filters, setFilters] = useDeepStore('filters.s2cells.cells')
  const safe = React.useMemo(
    () =>
      Array.isArray(filters)
        ? filters
        : typeof filters === 'string'
        ? // @ts-ignore
          filters.split(',')
        : [],
    [filters],
  )
  return (
    <CollapsibleItem open={enabled}>
      <FCSelectListItem
        sx={{ mx: 'auto', width: '90%' }}
        value={safe}
        renderValue={(selected) =>
          Array.isArray(selected) ? selected.join(', ') : selected
        }
        multiple
        onChange={({ target }) =>
          setFilters(
            typeof target.value === 'string'
              ? target.value.split(',')
              : target.value,
          )
        }
      >
        {S2_LEVELS.map((level) => (
          <MenuItem key={level} value={level}>
            {t('level')} {level}
          </MenuItem>
        ))}
      </FCSelectListItem>
    </CollapsibleItem>
  )
}
const S2Cells = React.memo(BaseS2Cells)

/** @param {{ item: (typeof WAYFARER_OPTIONS)[number], index: number, disabled: boolean }} props */
const WayfarerOption = ({ item, index, disabled }) => {
  const { t } = useTranslation()
  return (
    <BoolToggle
      field={`filters.submissionCells.${item}`}
      disabled={disabled}
      label=""
    >
      <ListItemText inset>
        {index > 1
          ? t('s2_cell_level', { level: item.substring(1, 3) })
          : t(index ? 'include_sponsored' : 'poi')}
      </ListItemText>
    </BoolToggle>
  )
}
const SubmissionCells = () => {
  const enabled = useStorage((s) => !!s.filters?.submissionCells?.enabled)
  return (
    <CollapsibleItem open={enabled}>
      {WAYFARER_OPTIONS.map((item, i) => (
        <WayfarerOption key={item} item={item} index={i} disabled={!enabled} />
      ))}
    </CollapsibleItem>
  )
}
const BaseSubmissionCells = React.memo(SubmissionCells)

const BaseRouteSlider = () => {
  const enabled = useStorage((s) => !!s.filters?.routes?.enabled)
  const [filters, setFilters] = useDeepStore('filters.routes.distance')
  const baseDistance = useMemory.getState().filters?.routes?.distance

  /** @type {import('@rm/types').RMSlider} */
  const slider = React.useMemo(() => {
    const min = baseDistance?.[0] || 0
    const max = baseDistance?.[1] || 25
    return {
      color: 'secondary',
      disabled: false,
      min,
      max,
      i18nKey: 'distance',
      step: 0.5,
      name: 'distance',
      label: 'km',
    }
  }, [baseDistance])

  return (
    <CollapsibleItem open={enabled}>
      <ListItem>
        <SliderTile
          slide={slider}
          handleChange={(_, values) => setFilters(values)}
          values={filters}
        />
      </ListItem>
    </CollapsibleItem>
  )
}
const RouteSlider = React.memo(BaseRouteSlider)

const BaseSpawnpointTTH = () => {
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
const SpawnpointTTH = React.memo(BaseSpawnpointTTH)

const BaseNestQuickSelector = () => {
  const enabled = useStorage((s) => !!s.filters?.nests?.pokemon)
  return (
    <CollapsibleItem open={enabled}>
      <Box px={2}>
        <SelectorListMemo category="nests" label="search_nests" height={350} />
      </Box>
    </CollapsibleItem>
  )
}
const NestQuickSelector = React.memo(BaseNestQuickSelector)

function ExtrasComponent({ category, subItem }) {
  switch (category) {
    case 'nests':
      return subItem === 'sliders' ? (
        <NestSlider />
      ) : subItem === 'pokemon' ? (
        <NestQuickSelector />
      ) : null
    case 's2cells':
      return subItem === 'enabled' ? <S2Cells /> : null
    case 'pokestops':
      return <PokestopDrawer subItem={subItem} />
    case 'gyms':
      return <GymDrawer subItem={subItem} />
    case 'wayfarer':
      return subItem === 'submissionCells' ? <BaseSubmissionCells /> : null
    case 'routes':
      return subItem === 'enabled' ? <RouteSlider /> : null
    case 'admin':
      return subItem === 'spawnpoints' ? <SpawnpointTTH /> : null
    default:
      return null
  }
}

export const Extras = React.memo(
  ExtrasComponent,
  (prev, next) =>
    prev.category === next.category && prev.subItem === next.subItem,
)
