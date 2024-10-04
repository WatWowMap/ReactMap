// @ts-check
import * as React from 'react'
import Grid2 from '@mui/material/Unstable_Grid2'
import TextField from '@mui/material/TextField'
import Slider from '@mui/material/Slider'
import { styled } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { ToggleTypography } from '@components/ToggleTypography'
import { MIN_MAX } from '@assets/constants'

const StyledTextField = styled(TextField, {
  shouldForwardProp: (prop) => prop !== 'textColor',
})<{ textColor: string }>(({ textColor }) => ({
  width: 80,
  color: textColor,
}))
const StyledSlider = styled(Slider)(() => ({ width: '100%' }))

type Value = ('' | number)[]

export function SliderTile({
  slide: {
    name,
    min,
    max,
    color,
    disabled,
    label,
    step,
    i18nKey,
    marks,
    markI18n,
    noTextInput,
  },
  handleChange,
  values,
}: import('@rm/types').RMSliderProps) {
  const { t } = useTranslation()
  const [temp, setTemp] = React.useState(values || [])
  const [text, setText] = React.useState<Value>(values || [])

  const handleSliderChange: import('@mui/material').SliderProps['onChangeCommitted'] =
    React.useCallback((_, newValues) => {
      if (Array.isArray(newValues)) {
        setText(newValues)
        setTemp(newValues)
      }
    }, [])
  const handleSliderChangeCommitted = React.useCallback(
    () => handleChange(name, temp),
    [name, temp, handleChange],
  )

  const handleTextInputChange: import('@mui/material').TextFieldProps['onChange'] =
    React.useCallback(
      ({ type, target }) => {
        const existing = text.slice()
        const num = +target.value
        const newValue = Number.isNaN(num) ? '' : num
        const targetIndex = target.id === 'min' ? 0 : 1

        if (newValue === '') {
          if (type === 'blur') {
            existing[targetIndex] = target.id === 'min' ? min : max
          } else {
            existing[targetIndex] = newValue
          }
          setText(existing)
        } else {
          existing[targetIndex] = newValue
        }
        if (type === 'blur') {
          existing.sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a - b))
        }
        setText(existing)
        if (existing.every((x) => typeof x === 'number')) {
          handleChange(name, existing)
        }
      },
      [text, min, max, handleChange],
    )

  const colorSx = React.useMemo(
    () => ({
      sx: {
        color:
          (temp && temp[0] === min && temp[1] === max) || disabled
            ? 'text.disabled'
            : 'inherit',
      },
    }),
    [temp, min, max, disabled],
  )
  const inputProps = React.useMemo(
    () => ({ min, max, autoFocus: false }),
    [min, max],
  )
  const marksMemo = React.useMemo(
    () =>
      marks?.map((value) => ({
        value,
        label: t(`${markI18n}${value}`),
      })),
    [marks, markI18n],
  )

  React.useEffect(() => {
    const safe = disabled || !values ? [min, max] : values

    if (safe.some((v, i) => v !== temp[i])) setTemp(values)
    if (safe.some((v, i) => v !== text[i])) setText(values)
  }, [values?.[0], values?.[1], disabled, min, max])

  if (!temp || !text) return null

  return (
    <Grid2
      container
      alignItems="center"
      justifyContent="center"
      minWidth={Math.min(window.innerWidth, 260)}
      width="100%"
    >
      <Grid2 xs={noTextInput ? 12 : 4}>
        <ToggleTypography color={colorSx.sx.color} lineHeight={1.2}>
          {t(i18nKey || `slider_${name}`)}
        </ToggleTypography>
      </Grid2>
      {!noTextInput &&
        MIN_MAX.map((each, index) => (
          <Grid2 key={each} textAlign={index ? 'center' : 'right'} xs={4}>
            <StyledTextField
              InputLabelProps={colorSx}
              InputProps={colorSx}
              disabled={disabled}
              id={each}
              inputProps={inputProps}
              label={`${t(each)} ${label ? t(label) : ''}`}
              name={name}
              size="small"
              textColor={colorSx.sx.color}
              type="number"
              value={text[index]}
              variant="outlined"
              onBlur={handleTextInputChange}
              onChange={handleTextInputChange}
            />
          </Grid2>
        ))}
      <Grid2 textAlign="center" xs={11}>
        <StyledSlider
          color={color}
          disabled={disabled}
          marks={marksMemo}
          max={max}
          min={min}
          name={name}
          step={step}
          value={temp}
          valueLabelFormat={marksMemo ? (e) => t(`${markI18n}${e}`) : undefined}
          onChange={handleSliderChange}
          onChangeCommitted={handleSliderChangeCommitted}
        />
      </Grid2>
    </Grid2>
  )
}
