import React, { Fragment } from 'react'
import {
  Grid,
  Typography,
  Switch,
  Select,
  MenuItem,
  Collapse,
} from '@material-ui/core'
import { Trans, useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import { useStatic } from '@hooks/useStore'

import MultiSelector from './MultiSelector'
import SliderTile from '../dialogs/filters/SliderTile'

export default function WithSubItems({
  category,
  filters,
  setFilters,
  subItem,
  noScanAreaOverlay,
  enableQuestSetSelector,
  enableConfirmedInvasions,
  data,
}) {
  const { t } = useTranslation()
  const available = useStatic((s) => s.available)

  if (category === 'scanAreas' && noScanAreaOverlay) {
    return null
  }

  const filterCategory =
    category === 'wayfarer' || category === 'admin' ? (
      <Switch
        checked={filters[subItem].enabled}
        onChange={() => {
          setFilters({
            ...filters,
            [subItem]: {
              ...filters[subItem],
              enabled: !filters[subItem].enabled,
            },
          })
        }}
      />
    ) : (
      <Switch
        checked={filters[category][subItem]}
        onChange={() => {
          setFilters({
            ...filters,
            [category]: {
              ...filters[category],
              [subItem]: !filters[category][subItem],
            },
          })
        }}
      />
    )

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
    )
  }

  return (
    <>
      <Grid item xs={8}>
        <Typography>
          {category === 'scanAreas'
            ? t('show_polygons')
            : t(Utility.camelToSnake(subItem))}
        </Typography>
      </Grid>
      <Grid item xs={4} style={{ textAlign: 'right' }}>
        {filterCategory}
      </Grid>
      {enableQuestSetSelector === true &&
        category === 'pokestops' &&
        subItem === 'quests' &&
        filters[category].quests === true && (
          <Grid item xs={12} style={{ textAlign: 'center' }}>
            <MultiSelector
              filters={filters}
              setFilters={setFilters}
              category={category}
              filterKey="showQuestSet"
              items={['with_ar', 'both', 'without_ar']}
            />
          </Grid>
        )}
      {category === 'pokestops' &&
        subItem === 'invasions' &&
        enableConfirmedInvasions && (
          <Grid
            item
            xs={12}
            style={{
              textAlign: 'center',
              padding: filters[category][subItem] ? 12 : 0,
              transition: 'padding 0.3s',
            }}
          >
            <Collapse in={filters[category][subItem]}>
              <Grid
                container
                style={{ width: '100%' }}
                alignItems="center"
                justifyContent="flex-end"
              >
                <Grid item xs={5} style={{ textAlign: 'left' }}>
                  <Typography>{t('only_confirmed')}</Typography>
                </Grid>
                <Grid item xs={5} style={{ textAlign: 'right' }}>
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
              </Grid>
            </Collapse>
          </Grid>
        )}
      {((category === 'pokestops' && subItem === 'allPokestops') ||
        (category === 'gyms' && subItem === 'allGyms')) &&
        filters[category][subItem] === true && (
          <>
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
          </>
        )}
      {category === 'gyms' &&
        subItem === 'gymBadges' &&
        filters[category].gymBadges === true && (
          <Grid item xs={12} style={{ textAlign: 'center' }}>
            <MultiSelector
              filters={filters}
              setFilters={setFilters}
              category={category}
              filterKey="badge"
              items={['all', 'badge_1', 'badge_2', 'badge_3']}
            />
          </Grid>
        )}
      {category === 'gyms' &&
        subItem === 'raids' &&
        filters[category].raids === true &&
        available?.gyms && (
          <>
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
          </>
        )}
      {category === 'wayfarer' && subItem === 'submissionCells' && (
        <>
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
        </>
      )}
    </>
  )
}
