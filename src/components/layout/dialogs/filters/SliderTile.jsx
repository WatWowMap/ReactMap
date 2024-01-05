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
 * @param {{
 *  filterSlide: import('@rm/types').RMSliderProps,
 *  handleChange: import('@rm/types').RMSliderHandleChange,
 *  filterValues: number[]
 * }} props
 */
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
  const { t } = useTranslation()
  const [temp, setTemp] = React.useState(filterValues || [])
  const [text, setText] = React.useState(filterValues || [])

  // console.log({ name, filterValues, min, max })
  const handleSliderChange =
    /** @type {import('@mui/material').SliderProps['onChangeCommitted']} */ (
      React.useCallback(
        (e, newValues) => {
          if (Array.isArray(newValues)) {
            if (e.type === 'mousemove') {
              setText(newValues)
              setTemp(newValues)
            } else if (e.type === 'mouseup') {
              handleChange(name, newValues, low, high)
            }
          }
        },
        [name, low, high, handleChange],
      )
    )
  const handleTextInputChange =
    /** @type {import('@mui/material').TextFieldProps['onChange']} */ (
      React.useCallback(
        (event) => {
          const safeVal = +event.target.value || ''
          const arrValues = /** @type {number[]} */ ([])
          if (typeof safeVal === 'number') {
            if (event.target.name === 'min') {
              arrValues.push(safeVal < min ? min : safeVal, text[1])
            } else {
              arrValues.push(text[0], safeVal > max ? max : safeVal)
            }
          }
          if (safeVal === '') {
            setText(arrValues)
          } else {
            setText(arrValues)
            handleChange(event.target.name, arrValues, low, high)
          }
        },
        [text, name, min, max, handleChange, low, high],
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
    () => marks?.map((value) => ({ value, label: t(`${markI18n}${value}`) })),
    [marks, markI18n],
  )

  React.useEffect(() => {
    const values = disabled || !filterValues ? [min, max] : filterValues
    if (values.some((v, i) => v !== temp[i])) setTemp(values)
    if (values.some((v, i) => v !== text[i])) setText(values)
  }, [filterValues?.[0], filterValues?.[1], disabled, min, max])

  if (!temp || !text) return null
  return (
    <Grid2
      container
      justifyContent="center"
      alignItems="center"
      minWidth={Math.min(window.innerWidth, 260)}
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
          valueLabelFormat={marks ? (e) => t(`${markI18n}${e}`) : undefined}
          step={step}
          marks={marksMemo}
        />
      </Grid2>
    </Grid2>
  )
}
