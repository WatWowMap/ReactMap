/* eslint-disable no-fallthrough */
/* eslint-disable default-case */
// @ts-check
import * as React from 'react'
import {
  Switch,
  Select,
  MenuItem,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material'
import { Trans, useTranslation } from 'react-i18next'

import { useDeepStore, useStatic, useStore } from '@hooks/useStore'
import {
  BADGES,
  FORT_LEVELS,
  QUEST_SETS,
  S2_LEVELS,
  ENUM_TTH,
  WAYFARER_OPTIONS,
} from '@assets/constants'

import { MultiSelectorStore } from './MultiSelector'
import SliderTile from '../dialogs/filters/SliderTile'
import { CollapsibleItem } from './CollapsibleItem'

const BaseNestSlider = () => {
  const slider = useStatic((s) => s.ui.nests?.sliders?.secondary?.[0])
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
  const enabled = useStore((s) => !!s.filters.s2cells.enabled)
  const [filters, setFilters] = useDeepStore('filters.s2cells.cells')
  const safe = React.useMemo(() => filters || [], [filters])
  return (
    <CollapsibleItem open={enabled}>
      <ListItem>
        <Select
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
        </Select>
      </ListItem>
    </CollapsibleItem>
  )
}
const S2Cells = React.memo(BaseS2Cells)

/** @param {{ category: 'pokestops' | 'gyms', subItem: string }} props */
const BaseAllForts = ({ category, subItem }) => {
  const { t } = useTranslation()
  const enabled = useStore((s) => !!s.filters?.[category]?.[subItem])
  return (
    <CollapsibleItem open={enabled}>
      <ListItem>
        <ListItemText primary={t('power_up')} />
        <MultiSelectorStore
          field={`filters.${category}.levels`}
          items={FORT_LEVELS}
        />
      </ListItem>
    </CollapsibleItem>
  )
}
const AllForts = React.memo(BaseAllForts)

const BaseGymBadges = () => {
  const enabled = useStore((s) => !!s.filters?.gyms?.gymBadges)
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
const GymBadges = React.memo(BaseGymBadges)

const BaseRaids = () => {
  const { t } = useTranslation()
  const available = useStatic((s) => s.available.gyms)
  const enabled = useStore((s) => !!s.filters?.gyms?.raids)
  const [filters, setFilters] = useDeepStore('filters.gyms.raidTier', '')
  return (
    <CollapsibleItem open={enabled}>
      <ListItem
        secondaryAction={
          <Select
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
          </Select>
        }
      >
        <ListItemText primary={t('raid_quick_select')} />
      </ListItem>
    </CollapsibleItem>
  )
}
const Raids = React.memo(BaseRaids)

const BaseQuestSet = () => {
  const enabled = useStore((s) => !!s.filters?.pokestops?.quests)
  return (
    <CollapsibleItem open={enabled}>
      <ListItem>
        <MultiSelectorStore
          field="filters.pokestops.showQuestSet"
          items={QUEST_SETS}
        />
      </ListItem>
    </CollapsibleItem>
  )
}
const QuestSet = React.memo(BaseQuestSet)

const BaseInvasion = () => {
  const { t } = useTranslation()
  const enabled = useStore((s) => !!s.filters?.pokestops?.invasions)
  const [filters, setFilters] = useDeepStore(
    'filters.pokestops.confirmed',
    false,
  )
  return (
    <CollapsibleItem open={enabled}>
      <ListItem>
        <ListItemText sx={{ pl: 4 }} primary={t('only_confirmed')} />
        <Switch
          checked={filters}
          onChange={() => setFilters((prev) => !prev)}
        />
      </ListItem>
    </CollapsibleItem>
  )
}
const Invasion = React.memo(BaseInvasion)

/** @param {{ id: string }} props */
const IndividualEvent = ({ id }) => {
  const { t } = useTranslation()
  const Icons = useStatic((s) => s.Icons)
  const [filters, setFilters] = useDeepStore(
    `filters.pokestops.filter.${id}.enabled`,
    false,
  )
  return (
    <ListItem>
      <ListItemIcon sx={{ justifyContent: 'center' }}>
        <img
          src={Icons.getIconById(id)}
          alt={t(`display_type_${id.slice(1)}`)}
          style={{ maxWidth: 30, maxHeight: 30 }}
        />
      </ListItemIcon>
      <ListItemText
        primary={t(`display_type_${id.slice(1)}`, t('unknown_event'))}
      />
      <Switch checked={filters} onChange={() => setFilters((prev) => !prev)} />
    </ListItem>
  )
}
const BaseEventStops = () => {
  const available = useStatic((s) => s.available.pokestops)
  const enabled = useStore((s) => !!s.filters?.pokestops?.eventStops)
  return (
    <CollapsibleItem open={enabled}>
      {available
        ?.filter((event) => event.startsWith('b'))
        .map((event) => (
          <IndividualEvent key={event} id={event} />
        ))}
    </CollapsibleItem>
  )
}
const EventStops = React.memo(BaseEventStops)

/** @param {{ item: (typeof WAYFARER_OPTIONS)[number], index: number, disabled: boolean }} props */
const WayfarerOption = ({ item, index, disabled }) => {
  const { t } = useTranslation()
  const [filters, setFilters] = useDeepStore(
    `filters.submissionCells.${item}`,
    false,
  )
  return (
    <ListItem key={item}>
      <ListItemText
        sx={{ pl: 4 }}
        primary={
          index > 1 ? (
            <Trans i18nKey="s2_cell_level">
              {{ level: item.substring(1, 3) }}
            </Trans>
          ) : (
            t(index ? 'include_sponsored' : 'poi')
          )
        }
      />
      <Switch
        checked={filters}
        onChange={() => setFilters((prev) => !prev)}
        disabled={disabled}
      />
    </ListItem>
  )
}
const SubmissionCells = () => {
  const enabled = useStore((s) => !!s.filters?.submissionCells?.enabled)
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
  const enabled = useStore((s) => !!s.filters?.routes?.enabled)
  const [filters, setFilters] = useDeepStore('filters.routes.distance')
  const baseDistance = useStatic.getState().filters?.routes?.distance

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
  const enabled = useStore((s) => !!s.filters?.spawnpoints?.enabled)
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

function Extras({ category, subItem }) {
  const { enableConfirmedInvasions, enableQuestSetSelector } =
    useStatic.getState().config.misc

  switch (category) {
    case 'nests':
      return subItem === 'sliders' ? <NestSlider /> : null
    case 's2cells':
      return subItem === 'cells' ? <S2Cells /> : null
    case 'pokestops':
      switch (subItem) {
        case 'allPokestops':
          return <AllForts category={category} subItem={subItem} />
        case 'quests':
          return enableQuestSetSelector ? <QuestSet /> : null
        case 'invasions':
          return enableConfirmedInvasions ? <Invasion /> : null
        case 'eventStops':
          return <EventStops />
      }
    case 'gyms':
      switch (subItem) {
        case 'allGyms':
          return <AllForts category={category} subItem={subItem} />
        case 'gymBadges':
          return <GymBadges />
        case 'raids':
          return <Raids />
      }
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

export default React.memo(
  Extras,
  (prev, next) =>
    prev.category === next.category && prev.subItem === next.subItem,
)
