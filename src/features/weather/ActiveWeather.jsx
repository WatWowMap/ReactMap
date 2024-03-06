// @ts-check
import * as React from 'react'
import { styled } from '@mui/material/styles'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Box from '@mui/material/Box'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point, polygon } from '@turf/helpers'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@hooks/useMemory'
import { useStorage } from '@hooks/useStorage'
import { apolloClient } from '@services/apollo'
import { Header } from '@components/dialogs/Header'
import { Footer } from '@components/dialogs/Footer'
import { Img } from '@components/Img'

import { WeatherPopup } from './WeatherPopup'

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

/** @param {import('@rm/types').Weather} props */
function Weather({ gameplay_condition, ...props }) {
  const Icons = useMemory((state) => state.Icons)
  const timeOfDay = useMemory((s) => s.timeOfDay)
  const clickable = useStorage((s) => s.userSettings?.weather?.clickableIcon)
  const { t } = useTranslation()

  const [open, setOpen] = React.useState(false)

  const footerOptions = React.useMemo(
    () =>
      /** @type {import('../../components/dialogs/Footer').FooterButton[]} */ ([
        {
          name: 'close',
          action: () => setOpen(false),
          color: 'primary',
        },
      ]),
    [setOpen],
  )
  if (!Icons) return null
  const [{ disableColorShift = false }] = Icons.getModifiers('weather')
  return (
    <React.Fragment key={gameplay_condition}>
      <StyledBox
        className="weather-icon flex-center"
        id="active-weather"
        onClick={() => setOpen(!!clickable)}
      >
        <Img
          className={disableColorShift ? '' : 'fancy'}
          src={Icons.getWeather(gameplay_condition, timeOfDay)}
          alt={t(`weather_${gameplay_condition}`)}
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
          <WeatherPopup {...props} gameplay_condition={gameplay_condition} />
        </DialogContent>
        <Footer role="" options={footerOptions} />
      </Dialog>
    </React.Fragment>
  )
}

const WeatherMemo = React.memo(
  Weather,
  (prev, next) => prev.gameplay_condition === next.gameplay_condition,
)

export function ActiveWeather() {
  const weatherEnabled = useStorage((s) => s.filters?.weather?.enabled ?? false)
  const location = useStorage((state) => state.location)
  const zoom = useStorage((s) => s.zoom)
  const allowedZoom = useMemory((s) => s.config.general.activeWeatherZoom)

  const [active, setActive] = React.useState(
    /** @type {import('@rm/types').Weather | null} */ (null),
  )

  React.useEffect(() => {
    if (zoom > allowedZoom) {
      const weatherCache = Object.values(apolloClient.cache.extract()).find(
        (x) =>
          x.__typename === 'Weather' &&
          // @ts-ignore
          booleanPointInPolygon(point(location), polygon([x.polygon])),
      )
      if (
        weatherCache &&
        'gameplay_condition' in weatherCache &&
        weatherCache?.gameplay_condition !== active?.gameplay_condition
      ) {
        // @ts-ignore
        setActive(weatherCache)
      }
    } else {
      setActive(null)
    }
  }, [location, zoom, allowedZoom])

  if (!weatherEnabled || !active) return null
  return <WeatherMemo {...active} />
}
