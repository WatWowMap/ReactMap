// @ts-check
import * as React from 'react'
import { Popup } from 'react-leaflet'
import Grid2 from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'

import { useFormatStore } from '@store/useFormatStore'
import { Timer } from '@components/popups/Timer'

/**
 * @param {{ hyperlocal: import('@rm/types').Hyperlocal, ts?: number }} props
 */
export function HyperlocalPopup({ hyperlocal }) {
  const { t } = useTranslation()
  const { distanceUnit } = useFormatStore()

  const radiusDisplay = React.useMemo(() => {
    const radius = hyperlocal.radius_m
    if (distanceUnit === 'miles') {
      return `${(radius * 0.000621371).toFixed(0)} ft`
    }
    return `${radius.toFixed(0)} m`
  }, [hyperlocal.radius_m, distanceUnit])

  return (
    <Popup>
      <Grid2 container spacing={1} sx={{ minWidth: 250 }}>
        <Grid2 xs={12}>
          <Typography variant="h6" align="center">
            {t('bonus_region')}
          </Typography>
        </Grid2>

        <Grid2 xs={6}>
          <Typography variant="caption" color="textSecondary">
            {t('experiment_id')}:
          </Typography>
        </Grid2>
        <Grid2 xs={6}>
          <Typography variant="body2">{hyperlocal.experiment_id}</Typography>
        </Grid2>

        <Grid2 xs={6}>
          <Typography variant="caption" color="textSecondary">
            {t('radius')}:
          </Typography>
        </Grid2>
        <Grid2 xs={6}>
          <Typography variant="body2">{radiusDisplay}</Typography>
        </Grid2>

        <Grid2 xs={6}>
          <Typography variant="caption" color="textSecondary">
            {t('start_time')}:
          </Typography>
        </Grid2>
        <Grid2 xs={6}>
          <Typography variant="body2">
            {new Date(hyperlocal.start_ms).toLocaleDateString()}{' '}
            {new Date(hyperlocal.start_ms).toLocaleTimeString()}
          </Typography>
        </Grid2>

        <Grid2 xs={6}>
          <Typography variant="caption" color="textSecondary">
            {t('end_time')}:
          </Typography>
        </Grid2>
        <Grid2 xs={6}>
          <Typography variant="body2">
            {new Date(hyperlocal.end_ms).toLocaleDateString()}{' '}
            {new Date(hyperlocal.end_ms).toLocaleTimeString()}
          </Typography>
        </Grid2>

        <Grid2 xs={6}>
          <Typography variant="caption" color="textSecondary">
            {t('challenge_bonus_key')}:
          </Typography>
        </Grid2>
        <Grid2 xs={6}>
          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
            {hyperlocal.challenge_bonus_key}
          </Typography>
        </Grid2>

        <Grid2 xs={12}>
          <Timer expireTime={hyperlocal.end_ms} />
        </Grid2>
      </Grid2>
    </Popup>
  )
}
