import React from 'react'
import { Grid, Typography, Slider } from '@material-ui/core'

import useStyles from '../../../../assets/mui/styling'

export default function SliderTile({
  name, shortName, filterValues, min, max, handleChange, color,
}) {
  const classes = useStyles()

  return (
    <>
      <Grid item xs={12}>
        <Typography id="range-slider" gutterBottom>
          {name} {filterValues[shortName][0]} - {filterValues[shortName][1]}
        </Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Slider
          name={shortName}
          min={min}
          max={max}
          color={color}
          className={classes.slider}
          value={filterValues[shortName]}
          onChange={(event, newValue) => {
            event.target.name = shortName
            event.target.value = newValue
            handleChange(event)
          }}
          valueLabelDisplay="auto"
        />
      </Grid>
    </>
  )
}
