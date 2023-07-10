import React from 'react'
import { Grid, Typography, Switch } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import { useStore } from '@hooks/useStore'

export default function ItemToggle({ category, subItem }) {
  const { t } = useTranslation()
  const filters = useStore((s) => s.filters)
  const { setFilters } = useStore.getState()

  if (
    (category === 's2cells' && subItem === 'cells') ||
    (category === 'nests' && subItem === 'sliders')
  ) {
    return null
  }

  return (
    <Grid container item xs={12} alignItems="center">
      <Grid item xs={8}>
        <Typography>
          {category === 'scanAreas'
            ? t('show_polygons')
            : t(Utility.camelToSnake(subItem))}
        </Typography>
      </Grid>
      <Grid item xs={4} style={{ textAlign: 'right' }}>
        {category === 'wayfarer' || category === 'admin' ? (
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
        )}
      </Grid>
    </Grid>
  )
}
