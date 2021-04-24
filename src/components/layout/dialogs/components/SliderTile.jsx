import React, { useState } from 'react'
import {
  Grid, Typography, Slider, TextField,
} from '@material-ui/core'

import useStyles from '../../../../assets/mui/styling'
import Utility from '../../../../services/Utility'

export default function SliderTile({
  name, shortName, filterValues, min, max, handleChange, color, disabled,
}) {
  const classes = useStyles()
  const [tempValues, setTempValues] = useState(filterValues[shortName])

  const handleTempChange = (event) => {
    const {
      id, name: filter, value, min: slideMin, max: slideMax,
    } = event.target
    let arrValues = value[1] ? value : []
    let safeVal
    if (id === `${filter}-min`) {
      safeVal = parseInt(value) ? parseInt(value) : parseInt(slideMin)
      arrValues = [safeVal, filterValues[filter][1]]
      handleChange(event)
    } else if (id === `${filter}-max`) {
      safeVal = parseInt(value) ? parseInt(value) : parseInt(slideMax)
      arrValues = [filterValues[filter][0], safeVal]
      handleChange(event)
    }
    setTempValues(arrValues)
  }

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
      {['min', 'max'].map((each, index) => (
        <Grid item xs={4} key={`${shortName}-${each}`}>
          <TextField
            className={classes.sliderInput}
            color="primary"
            id={`${shortName}-${each}`}
            label={Utility.getProperName(each)}
            name={shortName}
            value={tempValues[index]}
            onChange={handleTempChange}
            variant="outlined"
            size="small"
            type="number"
            disabled={disabled}
            inputProps={{
              min,
              max,
            }}
          />
        </Grid>
      ))}
      <Grid item xs={10}>
        <Slider
          name={shortName}
          min={min}
          max={max}
          color={color}
          className={classes.slider}
          value={tempValues}
          onChange={(event, newValue) => {
            event.target.value = newValue
            handleTempChange(event)
          }}
          onChangeCommitted={(event, newValue) => {
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
