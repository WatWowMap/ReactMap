// @ts-check
import * as React from 'react'
import {
  Grid,
  Button,
  Typography,
  OutlinedInput,
  InputAdornment,
  FormControl,
} from '@mui/material'
import { Circle, Marker, Popup, useMap } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import fallbackIcon from '@components/markers/fallback'
import { useWebhookStore } from '../store'

export default function DraggableMarker() {
  const map = useMap()
  const { t } = useTranslation()

  const webhookLocation = useWebhookStore((s) => s.location)
  const webhookMode = useWebhookStore((s) => s.mode)

  const [radius, setRadius] = React.useState(/** @type {number | ''} */ (1000))
  const [position, setPosition] = React.useState(webhookLocation)

  /** @type {import('react-leaflet').MarkerProps['eventHandlers']} */
  const eventHandlers = React.useMemo(
    () => ({
      dragend({ target }) {
        if (target) {
          const { lat, lng } = target.getLatLng()
          map.flyTo([lat, lng])
          setPosition([lat, lng])
        }
      },
      add({ target }) {
        if (target) target.openPopup()
      },
    }),
    [map],
  )

  React.useEffect(() => {
    if (webhookLocation.every((x) => x !== 0)) {
      setPosition(webhookLocation)
    }
  }, [webhookLocation])

  React.useEffect(() => {
    if (webhookMode === 'location') {
      map.panTo(webhookLocation)
    }
  }, [webhookMode])

  if (webhookMode !== 'location') return null
  return (
    <>
      <Marker
        draggable
        eventHandlers={eventHandlers}
        ref={(ref) => {
          if (ref) ref.openPopup()
        }}
        position={position}
        icon={fallbackIcon}
      >
        <Popup minWidth={90} maxWidth={150}>
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
                  type="number"
                  onChange={(e) =>
                    setRadius(+e.target.value.replace(/[^0-9.]/g, '') || '')
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
                  useWebhookStore.setState({
                    mode: 'open',
                    location: position,
                  })
                }}
              >
                {t('click_to_select')}
              </Button>
            </Grid>
          </Grid>
        </Popup>
      </Marker>
      <Circle radius={radius || 0} center={position} />
    </>
  )
}
