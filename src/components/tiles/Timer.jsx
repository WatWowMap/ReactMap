import React, { useState, useEffect } from 'react'
import { Tooltip } from 'react-leaflet'
import Utility from '../../services/Utility'

export default function Timer({ item }) {
  const [timer, setTimer] = useState(Utility.getTimeUntil(new Date(item.expire_timestamp * 1000), true))

  useEffect(() => {
    const timer2 = setTimeout(() => {
      setTimer(Utility.getTimeUntil(new Date(item.expire_timestamp * 1000), true))
    }, 1000)
    return () => clearTimeout(timer2)
  })

  return (
    <Tooltip direction="center" permanent position={[item.lat, item.lon]}>
      {timer.str}
    </Tooltip>
  )
}
