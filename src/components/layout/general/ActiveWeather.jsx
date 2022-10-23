/* eslint-disable jsx-a11y/no-static-element-interactions */
import React, { Fragment, useState } from 'react'
import { Dialog, DialogContent } from '@material-ui/core'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point, polygon } from '@turf/helpers'

import { useStore } from '@hooks/useStore'
import WeatherPopup from '@components/popups/Weather'
import Header from './Header'
import Footer from './Footer'

export default function ActiveWeather({
  Icons,
  timeOfDay,
  map,
  zoom,
  weather,
  isMobile,
  clickable,
}) {
  const location = useStore((state) => state.location)
  const [open, setOpen] = useState(false)

  const { disableColorShift = false } = Icons.getModifiers('weather')
  const active = weather.find(
    (cell) =>
      cell && booleanPointInPolygon(point(location), polygon([cell.polygon])),
  )

  return active?.gameplay_condition && map.getZoom() > zoom ? (
    <Fragment key={active?.gameplay_condition}>
      <div
        className="weather-icon"
        id="active-weather"
        onClick={() => setOpen(Boolean(clickable))}
        style={{
          zIndex: 1000,
          position: 'absolute',
          top: 20,
          right: 20,
          height: isMobile ? 36 : 50,
          width: isMobile ? 36 : 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          className={disableColorShift ? '' : 'fancy'}
          src={Icons.getWeather(active.gameplay_condition, timeOfDay)}
          alt={active.gameplay_condition}
          style={{
            width: isMobile ? 24 : 36,
            height: isMobile ? 24 : 36,
          }}
        />
      </div>
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
    </Fragment>
  ) : null
}
