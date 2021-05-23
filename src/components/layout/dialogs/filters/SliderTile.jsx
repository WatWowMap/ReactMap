import React, { useState, useEffect } from 'react'
import {
  Grid, Typography, Slider, TextField,
} from '@material-ui/core'

import Utility from '@services/Utility'
import { useStatic } from '@hooks/useStore'

export default function SliderTile({
  filterSlide: {
    name, shortName, min, max, color, disabled, label,
  }, handleChange, filterValues,
}) {
  const [tempValues, setTempValues] = useState(filterValues[shortName])
  const { text: { sliderInputs } } = useStatic(state => state.ui)

  useEffect(() => {
    setTempValues(filterValues[shortName])
  }, [filterValues])

  const handleTempChange = (event) => {
    const {
      id, name: slideName, value, min: slideMin, max: slideMax,
    } = event.target
    const arrValues = typeof value === 'object' ? value : []

    if (arrValues.length < 2) {
      const minMaxObj = { min: slideMin, max: slideMax }
      const minOrMax = id.split('-')[1]
      const safeVal = parseInt(value) ? parseInt(value) : parseInt(minMaxObj[minOrMax])

      if (minOrMax === 'min') {
        arrValues.push(safeVal, filterValues[slideName][1])
      } else {
        arrValues.push(filterValues[slideName][0], safeVal)
      }
      handleChange(slideName, arrValues)
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
      {sliderInputs.map((each, index) => (
        <Grid item xs={4} key={`${shortName}-${each}`}>
          <TextField
            style={{ width: 75 }}
            color="primary"
            id={`${shortName}-${each}`}
            label={`${Utility.getProperName(each)} ${label}`}
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
          style={{ width: 200 }}
          value={tempValues}
          onChange={(event, newValue) => {
            event.target.name = shortName
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
