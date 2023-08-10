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

import { useStatic, useStore } from '@hooks/useStore'

import MultiSelector from './MultiSelector'
import SliderTile from '../dialogs/filters/SliderTile'
import CollapsibleItem from './CollapsibleItem'

export default function Extras({ category, subItem, data }) {
  const { t } = useTranslation()
  const available = useStatic((s) => s.available)
  const Icons = useStatic((s) => s.Icons)
  const filters = useStore((s) => s.filters)
  const { setFilters } = useStore.getState()
  const {
    config: {
      map: { enableConfirmedInvasions, enableQuestSetSelector },
    },
    filters: staticFilters,
  } = useStatic.getState()

  if (category === 'nests' && subItem === 'sliders') {
    return (
      <ListItem>
        <SliderTile
          filterSlide={data.secondary[0]}
          handleChange={(_, values) =>
            setFilters({
              ...filters,
              [category]: {
                ...filters[category],
                avgFilter: values,
              },
            })
          }
          filterValues={filters[category]}
        />
      </ListItem>
    )
  }

  if (category === 's2cells' && subItem === 'cells') {
    return (
      <CollapsibleItem open={!!filters[category].enabled}>
        <Select
          fullWidth
          value={
            Array.isArray(filters[category][subItem])
              ? filters[category][subItem]
              : []
          }
          renderValue={(selected) => selected.join(', ')}
          multiple
          onChange={({ target }) =>
            setFilters({
              ...filters,
              [category]: {
                ...filters[category],
                [subItem]: target.value,
              },
            })
          }
        >
          {[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((level) => (
            <MenuItem key={level} value={level}>
              Level {level}
            </MenuItem>
          ))}
        </Select>
      </CollapsibleItem>
    )
  }

  if (
    (category === 'pokestops' && subItem === 'allPokestops') ||
    (category === 'gyms' && subItem === 'allGyms')
  ) {
    return (
      <CollapsibleItem open={filters[category][subItem] === true}>
        <ListItem
          secondaryAction={
            <MultiSelector
              filters={filters}
              setFilters={setFilters}
              category={category}
              filterKey="levels"
              items={['all', '1', '2', '3']}
            />
          }
        >
          <ListItemText primary={t('power_up')} />
        </ListItem>
      </CollapsibleItem>
    )
  }

  if (category === 'gyms') {
    if (subItem === 'gymBadges') {
      return (
        <CollapsibleItem
          open={filters[category].gymBadges === true}
          style={{ textAlign: 'center', padding: '12px 0' }}
        >
          <ListItem>
            <MultiSelector
              filters={filters}
              setFilters={setFilters}
              category={category}
              filterKey="badge"
              allowNone
              items={['all', 'badge_1', 'badge_2', 'badge_3']}
            />
          </ListItem>
        </CollapsibleItem>
      )
    }
    if (subItem === 'raids') {
      return (
        <CollapsibleItem
          open={filters[category].raids === true}
          style={{ width: '100%' }}
        >
          <ListItem
            secondaryAction={
              <Select
                value={filters[category].raidTier}
                fullWidth
                size="small"
                onChange={(e) => {
                  setFilters({
                    ...filters,
                    [category]: {
                      ...filters[category],
                      raidTier:
                        e.target.value === 'all' ? 'all' : +e.target.value,
                    },
                  })
                }}
              >
                {[
                  'all',
                  ...available.gyms
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
  }

  if (category === 'pokestops') {
    if (enableQuestSetSelector === true && subItem === 'quests') {
      return (
        <CollapsibleItem
          open={filters[category].quests === true}
          style={{ textAlign: 'center' }}
        >
          <ListItem>
            <MultiSelector
              filters={filters}
              setFilters={setFilters}
              category={category}
              filterKey="showQuestSet"
              items={['with_ar', 'both', 'without_ar']}
            />
          </ListItem>
        </CollapsibleItem>
      )
    }
    if (enableConfirmedInvasions === true && subItem === 'invasions') {
      return (
        <CollapsibleItem
          open={filters[category][subItem]}
          style={{ width: '100%' }}
          alignItems="center"
          justifyContent="flex-end"
        >
          <ListItem
            secondaryAction={
              <Switch
                checked={filters[category].confirmed}
                onChange={() => {
                  setFilters({
                    ...filters,
                    [category]: {
                      ...filters[category],
                      confirmed: !filters[category].confirmed,
                    },
                  })
                }}
              />
            }
          >
            <ListItemText sx={{ pl: 4 }} primary={t('only_confirmed')} />
          </ListItem>
        </CollapsibleItem>
      )
    }
    if (subItem === 'eventStops') {
      return (
        <CollapsibleItem open={filters[category][subItem]}>
          {available?.pokestops
            .filter((event) => event.startsWith('b'))
            .map((event) => (
              <ListItem key={event}>
                <ListItemIcon sx={{ justifyContent: 'center' }}>
                  <img
                    src={Icons.getIconById(event)}
                    alt={t(`display_type_${event.slice(1)}`)}
                    style={{ maxWidth: 30, maxHeight: 30 }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={t(
                    `display_type_${event.slice(1)}`,
                    t('unknown_event'),
                  )}
                />
                <Switch
                  checked={filters[category].filter[event].enabled}
                  onChange={() => {
                    setFilters({
                      ...filters,
                      [category]: {
                        ...filters[category],
                        filter: {
                          ...filters[category].filter,
                          [event]: {
                            ...filters[category].filter[event],
                            enabled: !filters[category].filter[event].enabled,
                          },
                        },
                      },
                    })
                  }}
                />
              </ListItem>
            ))}
        </CollapsibleItem>
      )
    }
  }

  if (category === 'wayfarer' && subItem === 'submissionCells') {
    return (
      <CollapsibleItem open={filters[subItem].enabled}>
        {['rings', 's14Cells', 's17Cells'].map((item, i) => (
          <ListItem
            key={item}
            secondaryAction={
              <Switch
                checked={filters[subItem][item]}
                onChange={() => {
                  setFilters({
                    ...filters,
                    [subItem]: {
                      ...filters[subItem],
                      [item]: !filters[subItem][item],
                    },
                  })
                }}
                disabled={!filters[subItem].enabled}
              />
            }
          >
            <ListItemText
              primary={
                i ? (
                  <Trans i18nKey="s2_cell_level">
                    {{ level: item.substring(1, 3) }}
                  </Trans>
                ) : (
                  t('poi')
                )
              }
            />
          </ListItem>
        ))}
      </CollapsibleItem>
    )
  }
  if (category === 'routes' && subItem === 'enabled') {
    return (
      <CollapsibleItem open={filters[category][subItem]}>
        <ListItem>
          <SliderTile
            filterSlide={{
              color: 'secondary',
              disabled: false,
              min: staticFilters.routes.distance[0] || 0,
              max: staticFilters.routes.distance[1] || 25,
              i18nKey: 'distance',
              step: 0.5,
              name: 'distance',
              label: 'km',
            }}
            handleChange={(_, values) =>
              setFilters({
                ...filters,
                [category]: {
                  ...filters[category],
                  distance: values,
                },
              })
            }
            filterValues={filters[category]}
          />
        </ListItem>
      </CollapsibleItem>
    )
  }

  if (category === 'admin' && subItem === 'spawnpoints') {
    return (
      <CollapsibleItem open={filters[subItem]?.enabled === true}>
        <ListItem>
          <MultiSelector
            filters={filters}
            setFilters={setFilters}
            category={subItem}
            filterKey="tth"
            items={[0, 1, 2]}
            tKey="tth_"
          />
        </ListItem>
      </CollapsibleItem>
    )
  }
  return null
}
