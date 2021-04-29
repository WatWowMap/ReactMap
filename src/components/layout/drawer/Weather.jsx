import React from 'react'
import { Grid, Typography, IconButton } from '@material-ui/core'
import { Check, Clear } from '@material-ui/icons'

export default function Weather({ filters, setFilters }) {
  return (
    <>
      <Grid item xs={6}>
        <Typography>
          Enabled
        </Typography>
      </Grid>
      <Grid item xs={6} style={{ textAlign: 'right' }}>
        <IconButton onClick={() => {
          setFilters({
            ...filters,
            weather: {
              ...filters.weather,
              enabled: !filters.weather.enabled,
            },
          })
        }}
        >
          {filters.weather.enabled
            ? <Check style={{ fontSize: 15, color: '#00e676' }} />
            : <Clear style={{ fontSize: 15, color: 'red' }} />}
        </IconButton>
      </Grid>
    </>
  )
}
