// @ts-check
import * as React from 'react'
import { Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'

/**
 *
 * @param {{ expireTime?: number, until?: boolean } & import('@mui/material').TypographyProps} props
 * @returns
 */
export default function TimeSince({ expireTime, until = false, ...props }) {
  const { t } = useTranslation()
  const endTime = new Date(expireTime * 1000)
  const [timerEnd, setTimerEnd] = React.useState(
    Utility.getTimeUntil(endTime, until),
  )

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setTimerEnd(Utility.getTimeUntil(endTime, until))
    }, 1000)
    return () => clearTimeout(timer)
  })

  React.useEffect(() => {
    setTimerEnd(Utility.getTimeUntil(endTime, until))
  }, [expireTime])

  return (
    <Typography variant="subtitle2" {...props}>
      {expireTime
        ? timerEnd.str.replace('days', t('days')).replace('day', t('day'))
        : t('never')}
    </Typography>
  )
}
