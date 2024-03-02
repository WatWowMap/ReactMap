// @ts-check
import * as React from 'react'
import { Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import ErrorBoundary from '@components/ErrorBoundary'

export function DevicePopup({ isOnline, ts, ...device }) {
  const { t } = useTranslation()

  React.useEffect(() => {
    Utility.analytics('Popup', 'Popup Clicked', 'Device')
  }, [])

  return (
    <ErrorBoundary noRefresh variant="h5">
      <Typography variant="h6" align="center">
        {device.id}
      </Typography>
      <Typography variant="subtitle2">
        {device.instance_name
          ? `${t('instance')}: ${device.instance_name}`
          : device.type}
      </Typography>
      <Timer device={device} t={t} ts={ts} />
      <Typography
        variant="subtitle1"
        color={isOnline ? 'success' : 'error'}
        align="center"
      >
        {t(isOnline ? 'online' : 'offline')}
      </Typography>
    </ErrorBoundary>
  )
}

const Timer = ({ device, t, ts }) => {
  const { updated } = device
  const lastSeen = new Date(updated * 1000)
  const [since, setSince] = React.useState(Utility.getTimeUntil(lastSeen))

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSince(Utility.getTimeUntil(lastSeen))
    }, 1000)
    return () => clearTimeout(timer)
  })

  return (
    <Typography variant="caption">
      {t('last_seen')}: {Utility.dayCheck(ts, updated)} (
      {since.str.replace('days', t('days')).replace('day', t('day'))})
    </Typography>
  )
}
