// @ts-check
import * as React from 'react'
import { styled } from '@mui/material/styles'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Box from '@mui/material/Box'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point, polygon } from '@turf/helpers'
import { useTranslation } from 'react-i18next'

import WeatherPopup from '@features/weather/WeatherPopup'
import { useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'
import { apolloClient } from '@services/apollo'
import Header from '@components/Header'
import Footer from '@components/Footer'
import { Img } from '@components/Img'

const StyledBox = styled(Box)(({ theme }) => ({
  zIndex: 1000,
  position: 'absolute',
  top: 20,
  right: 20,
  height: 36,
  width: 36,
  [theme.breakpoints.up('sm')]: {
    height: 50,
    width: 50,
  },
}))

/** @type {import('@mui/material').SxProps} */
const ImgSx = {
  width: { xs: 24, sm: 36 },
  height: { xs: 24, sm: 36 },
}

export default function ActiveWeather() {
  const weatherEnabled = useStorage((s) => s.filters?.weather?.enabled ?? false)
  const location = useStorage((state) => state.location)
  const Icons = useMemory((state) => state.Icons)
  const clickable = useStorage((s) => s.userSettings?.weather?.clickableIcon)
  const timeOfDay = useMemory((s) => s.timeOfDay)
  const zoom = useStorage((s) => s.zoom)
  const allowedZoom = useMemory((s) => s.config.general.activeWeatherZoom)
  const { t } = useTranslation()

  const [active, setActive] = React.useState(
    /** @type {import('@rm/types').Weather | null} */ (null),
  )
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (zoom > allowedZoom) {
      const weatherCache = Object.values(apolloClient.cache.extract()).find(
        (x) =>
          x.__typename === 'Weather' &&
          // @ts-ignore
          booleanPointInPolygon(point(location), polygon([x.polygon])),
      )
      // @ts-ignore
      if (weatherCache) setActive(weatherCache)
    } else {
      setActive(null)
    }
  }, [location, zoom, allowedZoom])

  const footerOptions = React.useMemo(
    () =>
      /** @type {import('../../../components/Footer').FooterButton[]} */ ([
        {
          name: 'close',
          action: () => setOpen(false),
          color: 'primary',
        },
      ]),
    [setOpen],
  )

  if (!weatherEnabled || !Icons || !active) return null
  const [{ disableColorShift = false }] = Icons.getModifiers('weather')
  return (
    <React.Fragment key={active?.gameplay_condition}>
      <StyledBox
        className="weather-icon flex-center"
        id="active-weather"
        onClick={() => setOpen(Boolean(clickable))}
      >
        <Img
          className={disableColorShift ? '' : 'fancy'}
          src={Icons.getWeather(active.gameplay_condition, timeOfDay)}
          alt={t(`weather_${active.gameplay_condition}`)}
          sx={ImgSx}
        />
      </StyledBox>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs">
        <Header titles={['weather']} action={() => setOpen(false)} />
        <DialogContent
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <WeatherPopup {...active} />
        </DialogContent>
        <Footer role="" options={footerOptions} />
      </Dialog>
    </React.Fragment>
  )
}
