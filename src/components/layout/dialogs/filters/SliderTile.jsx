import React, { useState, useEffect } from 'react'
import {
  Grid, Typography, Slider, TextField,
} from '@material-ui/core'
import { useTranslation } from 'react-i18next'

export default function SliderTile({
  filterSlide: {
    name, min, max, color, disabled, label, low, high,
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
      let safeVal = parseInt(value)
      if (safeVal === undefined || Number.isNaN(safeVal)) {
        safeVal = ''
      }
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
        handleChange(name, arrValues, low, high)
      }
    }
  }

  const textColor = (tempValues[0] === min && tempValues[1] === max) || disabled ? '#616161' : 'white'

  return (
    <Grid
      container
      direction="row"
      justifyContent="center"
      alignItems="center"
    >
      <Grid item xs={4}>
        <Typography noWrap={fullName} onClick={() => setFullName(!fullName)} style={{ color: textColor }}>
          {t(`${name}Slider`)}
        </Typography>
      </Grid>
      {['min', 'max'].map((each, index) => (
        <Grid item xs={4} key={`${name}-${each}`} style={{ textAlign: index ? 'center' : 'right' }}>
          <TextField
            style={{ width: 80 }}
            color={color}
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
      <Grid item xs={10} style={{ textAlign: 'center' }}>
        <Slider
          name={name}
          min={min}
          max={max}
          color={color}
          style={{ width: '100%' }}
          value={tempValues}
          onChange={handleTempChange}
          onChangeCommitted={(event, newValues) => {
            handleChange(name, newValues, low, high)
          }}
          disabled={disabled}
          valueLabelDisplay="auto"
        />
      </Grid>
    </Grid>
  )
}
