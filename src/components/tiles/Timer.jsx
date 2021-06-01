import React, { useState, useEffect } from 'react'
import { Tooltip } from 'react-leaflet'

import Utility from '../../services/Utility'

export default function Timer({
  timestamp, direction, label, offset,
}) {
  const [timer, setTimer] = useState(Utility.getTimeUntil(new Date(timestamp * 1000), true))

  useEffect(() => {
    const timer2 = setTimeout(() => {
      setTimer(Utility.getTimeUntil(new Date(timestamp * 1000), true))
    }, 1000)
    return () => clearTimeout(timer2)
  })

  return (
    <Tooltip direction={direction} permanent offset={offset || [0, 0]}>
      {label && label}
      {label && <br />}
      {timer.str}
    </Tooltip>
  )
}
