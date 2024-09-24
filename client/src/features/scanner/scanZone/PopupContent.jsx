// @ts-check
import * as React from 'react'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Slider from '@mui/material/Slider'
import { useTranslation } from 'react-i18next'
import { debounce } from 'lodash'

import { RADIUS_CHOICES } from '@assets/constants'

import { StyledSubHeader } from '../Shared'
import { ConfigContext } from '../ContextProvider'
import { useScanStore } from '../hooks/store'
import { AdvAccordion } from './AdvAccordion'

/**
 *
 * @returns
 */
export function ScanZonePopup() {
  const { t } = useTranslation()
  const { advancedOptions, maxSize } = React.useContext(ConfigContext)

  return (
    <>
      <StyledSubHeader>{t('scan_zone_size')}</StyledSubHeader>
      <ListItem style={{ padding: 0 }}>
        <ScanZoneSlider name="scanZoneSize" min={1} max={maxSize} step={1} />
      </ListItem>
      <StyledSubHeader>{t('scan_zone_range')}</StyledSubHeader>
      <ListItem style={{ padding: 2 }}>
        <SizeSelection />
      </ListItem>
      {advancedOptions && (
        <ListItem style={{ padding: '10px 0' }} disableGutters disablePadding>
          <AdvAccordion>
            <List
              style={{
                textAlign: 'center',
                padding: 0,
              }}
            >
              <StyledSubHeader>{t('scan_zone_spacing')}</StyledSubHeader>
              <ScanZoneSlider name="userSpacing" min={1} max={2} step={0.01} />
              <StyledSubHeader>{t('scan_zone_radius')}</StyledSubHeader>
              <ScanZoneSlider name="userRadius" min={50} max={900} />
            </List>
          </AdvAccordion>
        </ListItem>
      )}
    </>
  )
}

/**
 *
 * @param {{
 *  name: keyof import("@rm/types").OnlyType<import('../hooks/store').UseScanStore, number>,
 * } & import('@mui/material').SliderProps} props
 * @returns
 */
function ScanZoneSlider({ name, ...props }) {
  const value = useScanStore((s) => s[name])

  const handleChange = React.useCallback(
    (_, newValue) => useScanStore.setState({ [name]: newValue }),
    [name],
  )

  const debouncedHandleChange = debounce(handleChange, 10)

  return (
    <Slider
      value={value}
      onChange={debouncedHandleChange}
      onChangeCommitted={handleChange}
      valueLabelDisplay="auto"
      {...props}
    />
  )
}

function SizeSelection() {
  const { t } = useTranslation()
  const userRadius = useScanStore((s) => s.userRadius)
  const { pokemonRadius, gymRadius } = React.useContext(ConfigContext)

  const handleRadiusChange = React.useCallback(
    (newRadius) => () => useScanStore.setState({ userRadius: newRadius }),
    [],
  )

  return (
    <ButtonGroup size="small" fullWidth>
      {RADIUS_CHOICES.map((item) => {
        const radius = item === 'pokemon' ? pokemonRadius : gymRadius
        return (
          <Button
            key={item}
            onClick={handleRadiusChange(radius)}
            color={radius === userRadius ? 'primary' : 'secondary'}
            variant={radius === userRadius ? 'contained' : 'outlined'}
          >
            {t(item)}
          </Button>
        )
      })}
    </ButtonGroup>
  )
}
