import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { ErrorBoundary } from '@components/ErrorBoundary'
import { dayCheck } from '@utils/dayCheck'

export function SpawnpointPopup({
  despawn_sec,
  lat,
  lon,
  updated,
}: import('@rm/types').Spawnpoint) {
  const { t } = useTranslation()

  const minute = despawn_sec > 60 ? Math.round(despawn_sec / 60) : despawn_sec
  const minuteFixed = minute < 10 ? `0${minute}` : minute

  return (
    <ErrorBoundary noRefresh style={{}} variant="h5">
      <Typography align="center" variant="h5">
        {t('spawnpoint')}
      </Typography>
      <Typography align="center" variant="h6">
        {despawn_sec ? `00:${minuteFixed}` : '?'}
      </Typography>
      <Typography align="center" variant="subtitle1">
        {t('last_updated')}
      </Typography>
      <Typography align="center" variant="subtitle2">
        {dayCheck(Date.now() / 1000, updated)}
      </Typography>
      <br />
      <Typography align="center" variant="subtitle1">
        {t('location')}
      </Typography>
      <Typography align="center" variant="subtitle2">
        {lat},<br />
        {lon}
      </Typography>
    </ErrorBoundary>
  )
}
