// @ts-check
/* eslint-disable react/jsx-no-duplicate-props */
import * as React from 'react'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'
import TextField from '@mui/material/TextField'
import Slider from '@mui/material/Slider'
import { styled } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'
import { ToggleTypography } from '@components/layout/general/ToggleTypography'
import { SLIDER_LABELS } from '@assets/constants'

const StyledTextField =
  /** @type {React.FC<import('@mui/material').TextFieldProps & { textColor: string }>} */ (
    styled(TextField, { shouldForwardProp: (prop) => prop !== 'textColor' })(
      // @ts-ignore
      ({ textColor }) => ({
        width: 80,
        color: textColor,
      }),
    )
  )
const StyledSlider = styled(Slider)(() => ({ width: '100%' }))

/**
 * @typedef {('' | number)[]} Value
 * @param {{
 *  slide: import('@rm/types').RMSliderProps,
 *  handleChange: import('@rm/types').RMSliderHandleChange,
 *  values: number[]
 * }} props
 */
export default function SliderTile({
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
}) {
  const { t } = useTranslation()
  const [temp, setTemp] = React.useState(values || [])
  const [text, setText] = React.useState(/** @type {Value} */ (values || []))

  const handleSliderChange =
    /** @type {import('@mui/material').SliderProps['onChangeCommitted']} */ (
      React.useCallback(
        ({ type }, newValues) => {
          if (Array.isArray(newValues)) {
            if (type === 'mousemove') {
              setText(newValues)
              setTemp(newValues)
            } else if (type === 'mouseup') {
              handleChange(name, newValues)
            }
          }
        },
        [name, handleChange],
      )
    )
  const handleTextInputChange =
    /** @type {import('@mui/material').TextFieldProps['onChange']} */ (
      React.useCallback(
        ({ type, target }) => {
          const existing = text.slice()
          const newValue = +target.value || ''
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
            // annoying but TypeScript is rude for not liking my check above
            // @ts-ignore
            handleChange(name, existing)
          }
        },
        [text, min, max, handleChange],
      )
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
      justifyContent="center"
      alignItems="center"
      minWidth={Math.min(window.innerWidth, 260)}
      width="100%"
    >
      <Grid2 xs={noTextInput ? 12 : 4}>
        <ToggleTypography color={colorSx.sx.color} lineHeight={1.2}>
          {t(i18nKey || `slider_${name}`)}
        </ToggleTypography>
      </Grid2>
      {!noTextInput &&
        SLIDER_LABELS.map((each, index) => (
          <Grid2 key={each} xs={4} textAlign={index ? 'center' : 'right'}>
            <StyledTextField
              id={each}
              name={name}
              label={`${t(each)} ${label ? t(label) : ''}`}
              value={text[index]}
              variant="outlined"
              size="small"
              type="number"
              textColor={colorSx.sx.color}
              onChange={handleTextInputChange}
              onBlur={handleTextInputChange}
              disabled={disabled}
              InputLabelProps={colorSx}
              InputProps={colorSx}
              inputProps={inputProps}
            />
          </Grid2>
        ))}
      <Grid2 xs={11} textAlign="center">
        <StyledSlider
          name={name}
          min={min}
          max={max}
          color={color}
          value={temp}
          onChange={handleSliderChange}
          onChangeCommitted={handleSliderChange}
          disabled={disabled}
          valueLabelFormat={marksMemo ? (e) => t(`${markI18n}${e}`) : undefined}
          step={step}
          marks={marksMemo}
        />
      </Grid2>
    </Grid2>
  )
}
