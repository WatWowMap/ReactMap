import React from 'react'
import {
  Grid, Typography, Switch,
} from '@material-ui/core'

import Utility from '../../../services/Utility'

export default function Pokemon({
  category, filters, setFilters, subItem,
}) {
  return (
    <>
      <Grid item xs={6}>
        <Typography>{Utility.getProperName(subItem)}</Typography>
      </Grid>
      <Grid item xs={6} style={{ textAlign: 'right' }}>
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
      </Grid>
    </>
  )
}
