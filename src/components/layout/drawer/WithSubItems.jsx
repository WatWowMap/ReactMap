import React from 'react'
import {
  Grid, Typography, Switch, ButtonGroup, Button,
} from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'

export default function WithSubItems({
  category, filters, setFilters, subItem, noScanAreaOverlay,
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
      {category === 'pokestops' && subItem === 'quests' && filters['pokestops']['quests'] === true && (
        <Grid item xs={12} style={{ textAlign: 'right' }}>
          <ButtonGroup
            size="small"
          >
            <Button
              onClick={() => {
                setFilters({
                  ...filters,
                  [category]: {
                    ...filters[category],
                    showQuestSet: 'normal',
                  }
                })
              }}
              variant={filters[category].showQuestSet === 'normal' ? 'contained' : 'outlined'}
            >
              {t('withAr')}
            </Button>
            <Button
              onClick={() => {
                setFilters({
                  ...filters,
                  [category]: {
                    ...filters[category],
                    showQuestSet: 'both',
                  }
                })
              }}
              variant={filters[category].showQuestSet === 'both' ? 'contained' : 'outlined'}
            >
              {t('both')}
            </Button>
            <Button
              onClick={() => {
                setFilters({
                  ...filters,
                  [category]: {
                    ...filters[category],
                    showQuestSet: 'alternative',
                  }
                })
              }}
              variant={filters[category].showQuestSet === 'alternative' ? 'contained' : 'outlined'}
            >
              {t('withoutAr')}
            </Button>
          </ButtonGroup>
        </Grid>
      )}
    </>
  )
}
