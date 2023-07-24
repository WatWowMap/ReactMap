import React, { useState, useRef, useMemo, useEffect } from 'react'
import {
  Grid,
  Button,
  Typography,
  OutlinedInput,
  InputAdornment,
  FormControl,
} from '@mui/material'
import { Circle, Marker, Popup } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import fallbackIcon from '@components/markers/fallback'

export default function DraggableMarker({
  map,
  setWebhookMode,
  webhookLocation,
  setWebhookLocation,
}) {
  const [position, setPosition] = useState(webhookLocation)
  const [radius, setRadius] = useState(0)
  const { t } = useTranslation()
  const markerRef = useRef(null)
  const popupRef = useRef(null)
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current
        if (marker) {
          const { lat, lng } = marker.getLatLng()
          map.flyTo([lat, lng])
          setPosition([lat, lng])
          const popup = popupRef.current
          if (popup) {
            popup.openOn(map)
          }
        }
      },
    }),
    [],
  )

  useEffect(() => {
    const marker = markerRef.current
    if (marker) {
      marker.openPopup()
    }
  }, [])

  return (
    <>
      <Marker
        draggable
        eventHandlers={eventHandlers}
        position={position}
        ref={markerRef}
        icon={fallbackIcon()}
      >
        <Popup minWidth={90} maxWidth={150} ref={popupRef}>
          <Grid
            container
            alignItems="center"
            justifyContent="center"
            direction="column"
            spacing={2}
          >
            <Grid item>
              <Typography variant="subtitle2" align="center">
                {t('drag_and_drop')}
              </Typography>
            </Grid>
            <Grid item style={{ textAlign: 'center' }}>
              <FormControl variant="outlined">
                <OutlinedInput
                  value={radius}
                  onChange={(e) =>
                    setRadius(e.target.value.replace(/[^0-9.]/g, ''))
                  }
                  endAdornment={
                    <InputAdornment position="end">{t('m')}</InputAdornment>
                  }
                />
              </FormControl>
              <Typography variant="caption">{t('distance_radius')}</Typography>
            </Grid>
            <Grid item>
              <Button
                color="secondary"
                variant="contained"
                onClick={() => {
                  setWebhookMode('open')
                  setWebhookLocation(position)
                }}
              >
                {t('click_to_select')}
              </Button>
            </Grid>
          </Grid>
        </Popup>
      </Marker>
      <Circle radius={radius} center={position} />
    </>
  )
}
