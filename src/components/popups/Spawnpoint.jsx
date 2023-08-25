// @ts-check
import * as React from 'react'
import { Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import ErrorBoundary from '@components/ErrorBoundary'

/**
 *
 * @param {import('@rm/types').Spawnpoint} props
 * @returns
 */
export default function SpawnpointPopup({ despawn_sec, lat, lon, updated }) {
  const { t } = useTranslation()

  const minute = despawn_sec > 60 ? Math.round(despawn_sec / 60) : despawn_sec
  const minuteFixed = minute < 10 ? `0${minute}` : minute

  return (
    <ErrorBoundary noRefresh style={{}} variant="h5">
      <Typography variant="h5" align="center">
        {t('spawnpoint')}
      </Typography>
      <Typography variant="h6" align="center">
        {despawn_sec ? `00:${minuteFixed}` : '?'}
      </Typography>
      <Typography variant="subtitle1" align="center">
        {t('last_updated')}
      </Typography>
      <Typography variant="subtitle2" align="center">
        {Utility.dayCheck(Date.now() / 1000, updated)}
      </Typography>
      <br />
      <Typography variant="subtitle1" align="center">
        {t('location')}
      </Typography>
      <Typography variant="subtitle2" align="center">
        {lat},<br />
        {lon}
      </Typography>
    </ErrorBoundary>
  )
}
