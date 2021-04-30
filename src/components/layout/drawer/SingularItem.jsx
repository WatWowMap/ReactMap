import React from 'react'
import { Grid, Typography, Switch } from '@material-ui/core'

export default function SingularItem({ category, filters, setFilters }) {
  return (
    <>
      <Grid item xs={6}>
        <Typography>
          Enabled
        </Typography>
      </Grid>
      <Grid item xs={6} style={{ textAlign: 'right' }}>
        <Switch
          checked={filters[category].enabled}
          onChange={() => {
            setFilters({
              ...filters,
              [category]: {
                ...filters[category],
                enabled: !filters[category].enabled,
              },
            })
          }}
        />
      </Grid>
    </>
  )
}
