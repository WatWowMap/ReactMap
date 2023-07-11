import React, { Fragment } from 'react'
import { Grid, Typography, Switch, Select, MenuItem } from '@material-ui/core'
import { Trans, useTranslation } from 'react-i18next'

import { useStatic, useStore } from '@hooks/useStore'

import MultiSelector from './MultiSelector'
import SliderTile from '../dialogs/filters/SliderTile'
import { MemoCollapsibleItem } from './CollapsibleItem'

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
  } = useStatic.getState()

  if (category === 'nests' && subItem === 'sliders') {
    return (
      <Grid item xs={12} style={{ textAlign: 'center' }}>
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
      </Grid>
    )
  }

  if (category === 's2cells' && subItem === 'cells') {
    return (
      <MemoCollapsibleItem open={!!filters[category].enabled}>
        <Grid item xs={10}>
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
        </Grid>
      </MemoCollapsibleItem>
    )
  }

  if (
    (category === 'pokestops' && subItem === 'allPokestops') ||
    (category === 'gyms' && subItem === 'allGyms')
  ) {
    return (
      <MemoCollapsibleItem open={filters[category][subItem] === true}>
        <Grid item xs={4} style={{ textAlign: 'center' }}>
          <Typography>{t('power_up')}</Typography>
        </Grid>
        <Grid item xs={8} style={{ textAlign: 'center' }}>
          <MultiSelector
            filters={filters}
            setFilters={setFilters}
            category={category}
            filterKey="levels"
            items={['all', '1', '2', '3']}
          />
        </Grid>
      </MemoCollapsibleItem>
    )
  }

  if (category === 'gyms') {
    if (subItem === 'gymBadges') {
      return (
        <MemoCollapsibleItem
          open={filters[category].gymBadges === true}
          style={{ textAlign: 'center', padding: '12px 0' }}
        >
          <MultiSelector
            filters={filters}
            setFilters={setFilters}
            category={category}
            filterKey="badge"
            allowNone
            items={['all', 'badge_1', 'badge_2', 'badge_3']}
          />
        </MemoCollapsibleItem>
      )
    }
    if (subItem === 'raids') {
      return (
        <MemoCollapsibleItem
          open={filters[category].raids === true}
          style={{ width: '100%' }}
        >
          <Grid item xs={5}>
            <Typography>{t('raid_quick_select')}</Typography>
          </Grid>
          <Grid item xs={7} style={{ textAlign: 'right' }}>
            <Select
              value={filters[category].raidTier}
              fullWidth
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
          </Grid>
        </MemoCollapsibleItem>
      )
    }
  }

  if (category === 'pokestops') {
    if (enableQuestSetSelector === true && subItem === 'quests') {
      return (
        <MemoCollapsibleItem
          open={filters[category].quests === true}
          style={{ textAlign: 'center' }}
        >
          <MultiSelector
            filters={filters}
            setFilters={setFilters}
            category={category}
            filterKey="showQuestSet"
            items={['with_ar', 'both', 'without_ar']}
          />
        </MemoCollapsibleItem>
      )
    }
    if (enableConfirmedInvasions === true && subItem === 'invasions') {
      return (
        <MemoCollapsibleItem
          open={filters[category][subItem]}
          style={{ width: '100%' }}
          alignItems="center"
          justifyContent="flex-end"
        >
          <Grid item xs={6} style={{ textAlign: 'left' }}>
            <Typography>{t('only_confirmed')}</Typography>
          </Grid>
          <Grid item xs={4} style={{ textAlign: 'right' }}>
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
          </Grid>
        </MemoCollapsibleItem>
      )
    }
    if (subItem === 'eventStops') {
      return (
        <MemoCollapsibleItem open={filters[category][subItem]}>
          {available?.pokestops
            .filter((event) => event.startsWith('b'))
            .map((event) => (
              <Grid
                key={event}
                container
                style={{ width: '100%' }}
                alignItems="center"
                justifyContent="flex-end"
              >
                <Grid item xs={2}>
                  <img
                    src={Icons.getIconById(event)}
                    alt={t(`display_type_${event.slice(1)}`)}
                    style={{ maxWidth: 30, maxHeight: 30 }}
                  />
                </Grid>
                <Grid
                  item
                  xs={5}
                  style={{ textAlign: 'left', paddingLeft: 20 }}
                >
                  <Typography>
                    {t(`display_type_${event.slice(1)}`, t('unknown_event'))}
                  </Typography>
                </Grid>
                <Grid item xs={5} style={{ textAlign: 'right' }}>
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
                </Grid>
              </Grid>
            ))}
        </MemoCollapsibleItem>
      )
    }
  }

  if (category === 'wayfarer' && subItem === 'submissionCells') {
    return (
      <MemoCollapsibleItem open={filters[subItem].enabled}>
        {['rings', 's14Cells', 's17Cells'].map((item, i) => (
          <Fragment key={item}>
            <Grid item xs={8}>
              <Typography>
                {i ? (
                  <Trans i18nKey="s2_cell_level">
                    {{ level: item.substring(1, 3) }}
                  </Trans>
                ) : (
                  t('poi')
                )}
              </Typography>
            </Grid>
            <Grid item xs={4} style={{ textAlign: 'right' }}>
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
            </Grid>
          </Fragment>
        ))}
      </MemoCollapsibleItem>
    )
  }

  return null
}
