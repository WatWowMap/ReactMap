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

export function ScanZonePopup() {
  const { t } = useTranslation()
  const { advancedOptions, maxSize } = React.useContext(ConfigContext)

  return (
    <>
      <StyledSubHeader>{t('scan_zone_size')}</StyledSubHeader>
      <ListItem style={{ padding: 0 }}>
        <ScanZoneSlider max={maxSize} min={1} name="scanZoneSize" step={1} />
      </ListItem>
      <StyledSubHeader>{t('scan_zone_range')}</StyledSubHeader>
      <ListItem style={{ padding: 2 }}>
        <SizeSelection />
      </ListItem>
      {advancedOptions && (
        <ListItem disableGutters disablePadding style={{ padding: '10px 0' }}>
          <AdvAccordion>
            <List
              style={{
                textAlign: 'center',
                padding: 0,
              }}
            >
              <StyledSubHeader>{t('scan_zone_spacing')}</StyledSubHeader>
              <ScanZoneSlider max={2} min={1} name="userSpacing" step={0.01} />
              <StyledSubHeader>{t('scan_zone_radius')}</StyledSubHeader>
              <ScanZoneSlider max={900} min={50} name="userRadius" />
            </List>
          </AdvAccordion>
        </ListItem>
      )}
    </>
  )
}

function ScanZoneSlider({
  name,
  ...props
}: {
  name: keyof import('@rm/types').OnlyType<
    import('../hooks/store').UseScanStore,
    number
  >
} & import('@mui/material').SliderProps) {
  const value = useScanStore((s) => s[name])

  const handleChange = React.useCallback(
    (_, newValue) => useScanStore.setState({ [name]: newValue }),
    [name],
  )

  const debouncedHandleChange = debounce(handleChange, 10)

  return (
    <Slider
      value={value}
      valueLabelDisplay="auto"
      onChange={debouncedHandleChange}
      onChangeCommitted={handleChange}
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
    <ButtonGroup fullWidth size="small">
      {RADIUS_CHOICES.map((item) => {
        const radius = item === 'pokemon' ? pokemonRadius : gymRadius

        return (
          <Button
            key={item}
            color={radius === userRadius ? 'primary' : 'secondary'}
            variant={radius === userRadius ? 'contained' : 'outlined'}
            onClick={handleRadiusChange(radius)}
          >
            {t(item)}
          </Button>
        )
      })}
    </ButtonGroup>
  )
}
