// @ts-check
import * as React from 'react'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'

import { getTimeUntil } from '@utils/getTimeUntil'

/** @param {TimerProps} props */
export function RawTimeSince({ expireTime, until = false }) {
  const { t } = useTranslation()
  const endTime = expireTime * 1000
  const [timerEnd, setTimerEnd] = React.useState(getTimeUntil(endTime, until))

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setTimerEnd(getTimeUntil(endTime, until))
    }, 1000)
    return () => clearTimeout(timer)
  })

  React.useEffect(() => {
    setTimerEnd(getTimeUntil(endTime, until))
  }, [expireTime])

  return expireTime
    ? timerEnd.str.replace('days', t('days')).replace('day', t('day'))
    : t('never')
}

/**
 * @typedef {{ expireTime?: number, until?: boolean }} TimerProps
 */
/**
 *
 * @param {TimerProps & import('@mui/material').TypographyProps} props
 * @returns
 */
export function TimeSince({ expireTime, until = false, ...props }) {
  return (
    <Typography variant="subtitle2" {...props}>
      <RawTimeSince expireTime={expireTime} until={until} />
    </Typography>
  )
}
