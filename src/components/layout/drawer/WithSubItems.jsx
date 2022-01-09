import React from 'react'
import {
  Grid, Typography, Switch, ButtonGroup, Button,
} from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'

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
      {enableQuestSetSelector === true && category === 'pokestops' && subItem === 'quests' && filters.pokestops.quests === true && (
        <Grid item xs={12} style={{ textAlign: 'center' }}>
          <ButtonGroup
            size="small"
          >
            {['with_ar', 'both', 'without_ar'].map(questSet => (
              <Button
                key={questSet}
                onClick={() => setFilters({
                  ...filters,
                  [category]: {
                    ...filters[category],
                    showQuestSet: questSet,
                  },
                })}
                color={questSet === filters[category].showQuestSet ? 'primary' : 'secondary'}
                variant={questSet === filters[category].showQuestSet ? 'contained' : 'outlined'}
              >
                {t(questSet)}
              </Button>
            ))}
          </ButtonGroup>
        </Grid>
      )}
    </>
  )
}
