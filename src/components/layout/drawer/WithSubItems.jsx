import React from 'react'
import {
  Grid, Typography, Switch, Select, MenuItem,
} from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'

import MultiSelector from './MultiSelector'

export default function WithSubItems({
  category, filters, setFilters, subItem, noScanAreaOverlay, enableQuestSetSelector, available,
}) {
  const { t } = useTranslation()
  let filterCategory

  if (category === 'scanAreas' && noScanAreaOverlay) {
    return null
  }

  if (category === 'wayfarer' || category === 'admin') {
    filterCategory = (
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
    )
  } else {
    filterCategory = (
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
  }

  return (
    <>
      <Grid item xs={6}>
        <Typography>{category === 'scanAreas' ? t('show_polygons') : t(Utility.camelToSnake(subItem))}</Typography>
      </Grid>
      <Grid item xs={6} style={{ textAlign: 'right' }}>
        {filterCategory}
      </Grid>
      {(enableQuestSetSelector === true && category === 'pokestops' && subItem === 'quests' && filters[category].quests === true) && (
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
      {(category === 'gyms' && subItem === 'gymBadges' && filters[category].gymBadges === true) && (
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
      {(category === 'gyms' && subItem === 'raids' && filters[category].raids === true && available?.gyms) && (
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
                    raidTier: e.target.value === 'all' ? 'all' : +e.target.value,
                  },
                })
              }}
            >
              {['all', ...available.gyms.filter(x => x.startsWith('r')).map(y => +y.slice(1))].map((tier, i) => (
                <MenuItem key={tier} dense value={tier}>
                  {t(i ? `raid_${tier}_plural` : 'disabled')}
                </MenuItem>
              ))}
            </Select>
          </Grid>
        </>
      )}
    </>
  )
}
