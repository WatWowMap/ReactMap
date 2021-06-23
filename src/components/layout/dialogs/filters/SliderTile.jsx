import React, { useState, useEffect } from 'react'
import {
  Grid, Typography, Slider, TextField,
} from '@material-ui/core'
import { useTranslation } from 'react-i18next'

const sliderInputs = ['min', 'max']

export default function SliderTile({
  filterSlide: {
    name, min, max, color, disabled, label,
  }, handleChange, filterValues,
}) {
  const { t } = useTranslation()
  const [tempValues, setTempValues] = useState(filterValues[name])
  const [tempTextValues, setTempTextValues] = useState(filterValues[name])
  const [fullName, setFullName] = useState(true)

  useEffect(() => {
    setTempValues(filterValues[name])
    setTempTextValues(filterValues[name])
  }, [filterValues])

  const handleTempChange = (event, newValues) => {
    if (newValues) {
      setTempTextValues(newValues)
      setTempValues(newValues)
    } else {
      const { id, value } = event.target
      let safeVal = parseInt(value) || ''
      const arrValues = []
      if (id === 'min') {
        safeVal = safeVal < min ? min : safeVal
        arrValues.push(safeVal, filterValues[name][1])
      } else {
        safeVal = safeVal > max ? max : safeVal
        arrValues.push(filterValues[name][0], safeVal)
      }
      if (safeVal === '') {
        setTempTextValues(arrValues)
      } else {
        setTempTextValues(arrValues)
        handleChange(name, arrValues)
      }
    }
  }

  return (
    <Grid
      container
      direction="row"
      justify="center"
      alignItems="center"
    >
      <Grid item xs={4}>
        <Typography noWrap={fullName} onClick={() => setFullName(!fullName)}>
          {t(`${name}Slider`)}
        </Typography>
      </Grid>
      {sliderInputs.map((each, index) => (
        <Grid item xs={4} key={`${name}-${each}`}>
          <TextField
            style={{ width: 75 }}
            color="primary"
            id={each}
            label={`${t(each)} ${t(label)}`}
            name={name}
            value={tempTextValues[index]}
            onChange={handleTempChange}
            variant="outlined"
            size="small"
            type="number"
            disabled={disabled}
            inputProps={{
              min,
              max,
              autoFocus: false,
            }}
          />
        </Grid>
      ))}
      <Grid item xs={10}>
        <Slider
          name={name}
          min={min}
          max={max}
          color={color}
          style={{ width: 200 }}
          value={tempValues}
          onChange={handleTempChange}
          onChangeCommitted={(event, newValues) => {
            handleChange(name, newValues)
          }}
          disabled={disabled}
          valueLabelDisplay="auto"
        />
      </Grid>
    </Grid>
  )
}
