import React, { useState, useEffect } from 'react'
import { Typography } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'
import ErrorBoundary from '@components/ErrorBoundary'

export default function DevicePopup({ device, isOnline, ts }) {
  const { t } = useTranslation()

  useEffect(() => {
    Utility.analytics('Popup', 'Popup Clicked', 'Device')
  }, [])

  return (
    <ErrorBoundary noRefresh style={{}} variant="h5">
      <Typography variant="h6" align="center">
        {device.id}
      </Typography>
      <Typography variant="subtitle2">
        {t('instance')} {device.instance_name}
      </Typography>
      <Timer device={device} t={t} ts={ts} />
      <Typography
        variant="subtitle1"
        style={{ color: isOnline ? '#00e676' : '#ff5722' }}
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
  const [since, setSince] = useState(Utility.getTimeUntil(lastSeen))

  useEffect(() => {
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
