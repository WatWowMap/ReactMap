// @ts-check
import * as React from 'react'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'

import { Timer } from '@components/popups/Timer'
import { formatInterval } from '@utils/formatInterval'

/**
 * @param {{ hyperlocal: import('@rm/types').Hyperlocal, ts?: number }} props
 */
export function HyperlocalPopup({
  hyperlocal,
  ts = Math.floor(Date.now() / 1000),
}) {
  const { t, i18n } = useTranslation()

  // Format times in h:m:s AM/PM format
  const formatTime = React.useCallback(
    (timestamp) => {
      if (!timestamp) return null
      const formatter = new Intl.DateTimeFormat(i18n.language, {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      })
      return formatter.format(timestamp * 1000)
    },
    [i18n.language],
  )

  // Calculate time ago for last seen
  const timeAgo = React.useMemo(() => {
    if (!hyperlocal.updated_ms) return null
    const updatedSeconds = Math.floor(hyperlocal.updated_ms / 1000)
    const diff = ts - updatedSeconds
    const { str } = formatInterval(diff * 1000)
    return str
  }, [hyperlocal.updated_ms, ts])

  const startTime = hyperlocal.start_ms
    ? Math.floor(hyperlocal.start_ms / 1000)
    : null
  const endTime = hyperlocal.end_ms
    ? Math.floor(hyperlocal.end_ms / 1000)
    : null
  const lastSeenTime = hyperlocal.updated_ms
    ? Math.floor(hyperlocal.updated_ms / 1000)
    : null

  return (
    <div style={{ textAlign: 'center', minWidth: 200 }}>
      <Typography variant="h6" gutterBottom>
        {`${t(hyperlocal.challenge_bonus_key)} (${hyperlocal.experiment_id})`}
      </Typography>

      <Typography variant="subtitle1" gutterBottom>
        {t('starts')}: {formatTime(startTime)}
      </Typography>

      <Typography variant="subtitle1" gutterBottom>
        {t('ends')}: {formatTime(endTime)}
      </Typography>

      <Typography variant="h6" gutterBottom>
        <Timer expireTime={endTime} />
      </Typography>

      <Typography variant="subtitle1" gutterBottom>
        Radius: {hyperlocal.radius_m}m
      </Typography>

      <Typography variant="body2" gutterBottom>
        {t('last_seen')}: {formatTime(lastSeenTime)}{' '}
        {timeAgo && `(${timeAgo} ago)`}
      </Typography>
    </div>
  )
}
