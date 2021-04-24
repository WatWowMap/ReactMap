import React, { memo } from 'react'
import {
  Grid, Typography, Slider, TextField,
} from '@material-ui/core'

import useStyles from '../../../../assets/mui/styling'

const SliderTile = ({
  name, shortName, filterValues, min, max, handleChange, color, disabled,
}) => {
  const classes = useStyles()

  return (
    <Grid
      container
      direction="row"
      justify="center"
      alignItems="center"
    >
      <Grid item xs={4}>
        <Typography>{name}</Typography>
      </Grid>
      <Grid item xs={4}>
        <TextField
          className={classes.sliderInput}
          color="primary"
          id={`${shortName}-min`}
          label="Min"
          name={shortName}
          value={filterValues[shortName][0]}
          onChange={handleChange}
          variant="outlined"
          size="small"
        />
      </Grid>
      <Grid item xs={4}>
        <TextField
          className={classes.sliderInput}
          color="secondary"
          id={`${shortName}-max`}
          label="Max"
          name={shortName}
          value={filterValues[shortName][1]}
          onChange={handleChange}
          variant="outlined"
          size="small"
        />
      </Grid>
      <Grid item xs={10}>
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
          disabled={disabled}
          valueLabelDisplay="auto"
        />
      </Grid>
    </Grid>
  )
}

const areEqual = (prevSlider, nextSlider) => (
  prevSlider.filterValues[prevSlider.shortName] === nextSlider.filterValues[nextSlider.shortName]
)

export default memo(SliderTile, areEqual)
