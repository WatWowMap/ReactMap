// @ts-check

import { getTimeUntil } from '@utils/getTimeUntil'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Tooltip } from 'react-leaflet'

const Timer = ({ timestamp }) => {
  const { t } = useTranslation()
  const [timer, setTimer] = React.useState(getTimeUntil(timestamp * 1000, true))

  React.useEffect(() => {
    const timer2 = setTimeout(() => {
      setTimer(getTimeUntil(timestamp * 1000, true))
    }, 1000)
    return () => clearTimeout(timer2)
  })

  return (
    <div>{timer.str.replace('days', t('days')).replace('day', t('day'))}</div>
  )
}

/**
 * TODO: Come back and makes timers only accept 1 timer
 * @param {{ timers: number[], offset?: [number, number], children?: React.ReactNode }} props
 * @returns
 */
export function TooltipWrapper({ timers, offset, children }) {
  return (
    <Tooltip direction="bottom" permanent offset={offset}>
      {children}
      {[...new Set(timers)].map((timer, i) => (
        <Timer
          // biome-ignore lint/suspicious/noArrayIndexKey: pre-existing, tracked for follow-up
          key={timer + i * 123}
          timestamp={timer}
        />
      ))}
    </Tooltip>
  )
}
