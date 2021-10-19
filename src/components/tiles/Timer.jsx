import React, { useState, useEffect } from 'react'
import { Tooltip } from 'react-leaflet'
import Utility from '@services/Utility'

const Timer = ({ timestamp }) => {
  const [timer, setTimer] = useState(Utility.getTimeUntil(new Date(timestamp * 1000), true))

  useEffect(() => {
    const timer2 = setTimeout(() => {
      setTimer(Utility.getTimeUntil(new Date(timestamp * 1000), true))
    }, 1000)
    return () => clearTimeout(timer2)
  })

  return (
    <div>
      {timer.str}
    </div>
  )
}

export default function TooltipWrapper({ timers, offset }) {
  return (
    <Tooltip direction="bottom" permanent offset={offset}>
      {timers.map((timer, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <Timer key={timer + i * 123} timestamp={timer} multi={timers.length > 1} />
      ))}
    </Tooltip>
  )
}
