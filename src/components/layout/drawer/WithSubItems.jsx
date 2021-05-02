import React from 'react'
import {
  Grid, Typography, Switch,
} from '@material-ui/core'

import Utility from '../../../services/Utility'

export default function WithSubItems({
  category, filters, setFilters, subItem,
}) {
  let filterCategory

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
        <Typography>{Utility.getProperName(subItem)}</Typography>
      </Grid>
      <Grid item xs={6} style={{ textAlign: 'right' }}>
        {filterCategory}
      </Grid>
    </>
  )
}
