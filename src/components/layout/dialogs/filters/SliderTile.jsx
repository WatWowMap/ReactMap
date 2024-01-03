/* eslint-disable react/jsx-no-duplicate-props */
import React, { useState, useEffect } from 'react'
import { Grid, Typography, Slider, TextField } from '@mui/material'
import { useTranslation } from 'react-i18next'

export default function SliderTile({
  filterSlide: {
    name,
    min,
    max,
    color,
    disabled,
    label,
    low,
    high,
    step,
    i18nKey,
    marks,
    markI18n,
    noTextInput,
  },
  handleChange,
  filterValues,
}) {
  const values = disabled ? [min, max] : filterValues[name]
  const { t } = useTranslation()
  const [tempValues, setTempValues] = useState(values)
  const [tempTextValues, setTempTextValues] = useState(values)
  const [fullName, setFullName] = useState(true)

  useEffect(() => {
    setTempValues(values)
    setTempTextValues(values)
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
        arrValues.push(safeVal, values[1])
      } else {
        safeVal = safeVal > max ? max : safeVal
        arrValues.push(values[0], safeVal)
      }
      if (safeVal === '') {
        setTempTextValues(arrValues)
      } else {
        setTempTextValues(arrValues)
        handleChange(name, arrValues, low, high)
      }
    }
  }

  if (!tempValues) return null

  const textColor =
    (tempValues && tempValues[0] === min && tempValues[1] === max) || disabled
      ? 'text.disabled'
      : 'inherit'

  const translated = t(i18nKey || `slider_${name}`)

  return (
    <Grid
      container
      direction="row"
      justifyContent="center"
      alignItems="center"
      minWidth={Math.min(window.innerWidth, 260)}
    >
      <Grid item xs={noTextInput ? 12 : 4}>
        <Typography
          noWrap={fullName}
          onClick={() => setFullName(!fullName)}
          color={textColor}
        >
          {translated}
        </Typography>
      </Grid>
      {(noTextInput ? [] : ['min', 'max']).map((each, index) => (
        <Grid
          item
          xs={4}
          key={`${name}-${each}`}
          style={{ textAlign: index ? 'center' : 'right' }}
        >
          <TextField
            sx={{ width: 80, color: textColor }}
            id={each}
            label={`${t(each)} ${label ? t(label) : ''}`}
            name={name}
            value={tempTextValues[index]}
            onChange={handleTempChange}
            variant="outlined"
            size="small"
            type="number"
            disabled={disabled}
            InputLabelProps={{
              sx: { color: textColor },
            }}
            InputProps={{
              sx: { color: textColor },
            }}
            inputProps={{
              min,
              max,
              autoFocus: false,
            }}
          />
        </Grid>
      ))}
      <Grid item xs={11} style={{ textAlign: 'center' }}>
        <Slider
          name={name}
          min={min}
          max={max}
          color={color}
          style={{ width: '100%' }}
          value={tempValues}
          onChange={handleTempChange}
          onChangeCommitted={(_, newValues) => {
            handleChange(name, newValues, low, high)
          }}
          disabled={disabled}
          valueLabelFormat={marks ? (e) => t(`${markI18n}${e}`) : undefined}
          step={step}
          marks={
            marks
              ? marks.map((each) => ({
                  value: each,
                  label: t(`${markI18n}${each}`),
                }))
              : undefined
          }
        />
      </Grid>
    </Grid>
  )
}
