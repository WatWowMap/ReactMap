import React from 'react'
import { Typography } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

export default function SpawnpointPopup({ spawnpoint }) {
  const { t } = useTranslation()
  const {
    despawn_sec: despawn, lat, lon, updated,
  } = spawnpoint

  return (
    <>
      <Typography variant="h5" align="center">{t('spawnpoint')}</Typography>
      <Typography variant="h6" align="center">
        {despawn ? `00:${Math.round(despawn / 60)}` : '?'}
      </Typography>
      <Typography variant="subtitle1">
        {t('lastUpdated')}: {(new Date(updated * 1000)).toLocaleTimeString()}
      </Typography>
      <Typography variant="caption">
        {t('location')}:<br />
        {lat},<br />
        {lon}
      </Typography>
    </>
  )
}
