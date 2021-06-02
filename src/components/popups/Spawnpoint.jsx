import React from 'react'
import { Typography } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'

export default function SpawnpointPopup({ spawnpoint, ts }) {
  const { t } = useTranslation()
  const {
    despawn_sec: despawn, lat, lon, updated,
  } = spawnpoint

  const minute = Math.round(despawn / 60)
  const minuteFixed = minute < 10 ? `0${minute}` : minute

  return (
    <>
      <Typography variant="h5" align="center">{t('spawnpoint')}</Typography>
      <Typography variant="h6" align="center">
        {despawn ? `00:${minuteFixed}` : '?'}
      </Typography>
      <Typography variant="subtitle1">
        {t('lastUpdated')}:
      </Typography>
      <Typography variant="subtitle1">
        {Utility.dayCheck(ts, updated)}
      </Typography>
      <Typography variant="caption">
        {t('location')}:<br />
        {lat},<br />
        {lon}
      </Typography>
    </>
  )
}
