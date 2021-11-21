/* eslint-disable camelcase */
import React, { useState, useEffect } from 'react'
import { Typography } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'

export default function DevicePopup({ device, status, ts }) {
  const { t } = useTranslation()

  useEffect(() => {
    Utility.analytics('Popup', 'Popup Clicked', 'Device')
  }, [])

  return (
    <>
      <Typography variant="h6" align="center">
        {device.uuid}
      </Typography>
      <Typography variant="subtitle2">
        {t('instance')} {device.instance_name}
      </Typography>
      <Timer device={device} t={t} ts={ts} />
      <Typography
        variant="subtitle1"
        style={{ color: `${status === 'offline' ? '#ff5722' : '#00e676'}` }}
        align="center"
      >
        {t(status)}
      </Typography>
    </>
  )
}

const Timer = ({ device, t, ts }) => {
  const { last_seen } = device
  const lastSeen = new Date(last_seen * 1000)
  const [since, setSince] = useState(Utility.getTimeUntil(lastSeen))

  useEffect(() => {
    const timer = setTimeout(() => {
      setSince(Utility.getTimeUntil(lastSeen))
    }, 1000)
    return () => clearTimeout(timer)
  })

  return (
    <Typography variant="caption">
      {t('last_seen')}: {Utility.dayCheck(ts, last_seen)} ({since.str})
    </Typography>
  )
}
