// @ts-check
import * as React from 'react'
import { styled } from '@mui/material/styles'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Box from '@mui/material/Box'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point, polygon } from '@turf/helpers'
import { useQuery } from '@apollo/client'

import WeatherPopup from '@components/popups/Weather'
import { useStatic, useStore } from '@hooks/useStore'
import getAllWeather from '@services/queries/weather'
import { getQueryArgs } from '@services/functions/getQueryArgs'

import Header from './Header'
import Footer from './Footer'
import { Img } from '../custom/CustomImg'

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
  const weatherEnabled = useStore((s) => s.filters?.weather?.enabled ?? false)
  const location = useStore((state) => state.location)
  const Icons = useStatic((state) => state.Icons)
  const clickable = useStore((s) => s.userSettings?.weather?.clickableIcon)
  const timeOfDay = useStatic((s) => s.timeOfDay)
  const zoom = useStore((s) => s.zoom)
  const allowedZoom = useStatic((s) => s.config.map.activeWeatherZoom)

  const { data, previousData } = useQuery(getAllWeather, {
    fetchPolicy: 'cache-only',
    skip: !weatherEnabled,
    variables: {
      ...getQueryArgs(),
      filters: {
        onlyAreas: useStore.getState().filters.scanAreas?.filter?.areas || [],
      },
    },
  })

  const [open, setOpen] = React.useState(false)

  if (!weatherEnabled || !Icons) return null

  const active = (data || previousData)?.weather?.find(
    (cell) =>
      cell && booleanPointInPolygon(point(location), polygon([cell.polygon])),
  )

  const [{ disableColorShift = false }] = Icons.getModifiers('weather')

  return active?.gameplay_condition && zoom > allowedZoom ? (
    <React.Fragment key={active?.gameplay_condition}>
      <StyledBox
        className="weather-icon flex-center"
        id="active-weather"
        onClick={() => setOpen(Boolean(clickable))}
      >
        <Img
          className={disableColorShift ? '' : 'fancy'}
          src={Icons.getWeather(active.gameplay_condition, timeOfDay)}
          alt={active.gameplay_condition}
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
          <WeatherPopup weather={active} Icons={Icons} ts={Date.now() / 1000} />
        </DialogContent>
        <Footer
          role=""
          options={[
            {
              icon: 'Close',
              name: 'close',
              action: () => setOpen(false),
              color: 'primary',
            },
          ]}
        />
      </Dialog>
    </React.Fragment>
  ) : null
}
