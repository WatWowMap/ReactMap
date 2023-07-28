import React, { useState, useEffect } from 'react'
import { Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'

export default function TimeSince({ expireTime, until = false }) {
  const { t } = useTranslation()
  const endTime = new Date(expireTime * 1000)
  const [timerEnd, setTimerEnd] = useState(Utility.getTimeUntil(endTime, until))

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimerEnd(Utility.getTimeUntil(endTime, until))
    }, 1000)
    return () => clearTimeout(timer)
  })

  useEffect(() => {
    setTimerEnd(Utility.getTimeUntil(endTime, until))
  }, [expireTime])

  return (
    <Typography variant="subtitle2">
      {expireTime
        ? timerEnd.str.replace('days', t('days')).replace('day', t('day'))
        : t('never')}
    </Typography>
  )
}
