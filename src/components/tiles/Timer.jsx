import React, { useState, useEffect } from 'react'
import { Tooltip } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import Utility from '@services/Utility'

const Timer = ({ timestamp }) => {
  const { t } = useTranslation()
  const [timer, setTimer] = useState(
    Utility.getTimeUntil(new Date(timestamp * 1000), true),
  )

  useEffect(() => {
    const timer2 = setTimeout(() => {
      setTimer(Utility.getTimeUntil(new Date(timestamp * 1000), true))
    }, 1000)
    return () => clearTimeout(timer2)
  })

  return (
    <div>{timer.str.replace('days', t('days')).replace('day', t('day'))}</div>
  )
}

export default function TooltipWrapper({ timers, offset, children }) {
  return (
    <Tooltip direction="bottom" permanent offset={offset}>
      {children}
      {[...new Set(timers)].map((timer, i) => (
        <Timer
          // eslint-disable-next-line react/no-array-index-key
          key={timer + i * 123}
          timestamp={timer}
          multi={timers.length > 1}
        />
      ))}
    </Tooltip>
  )
}
