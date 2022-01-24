import React from 'react'
import {
  Grid, Typography, Switch,
} from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import MultiSelector from './MultiSelector'

export default function WithSubItems({
  category, filters, setFilters, subItem, noScanAreaOverlay, enableQuestSetSelector,
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
      {enableQuestSetSelector === true && category === 'pokestops' && subItem === 'quests' && filters[category].quests === true && (
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
      {category === 'gyms' && subItem === 'gymBadges' && filters[category].gymBadges === true && (
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
    </>
  )
}
