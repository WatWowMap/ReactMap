import React, { useState, useEffect } from 'react'
import { Typography } from '@material-ui/core'
import Utility from '../../services/Utility'

export default function DevicePopup({ device, status }) {
  return (
    <>
      <Typography variant="h6" align="center">
        {device.uuid}
      </Typography>
      <Typography variant="subtitle2">
        Instance: {device.instance_name}
      </Typography>
      <Timer device={device} />
      <Typography
        variant="subtitle1"
        style={{ color: `${status ? '#ff5722' : '#00e676'}` }}
        align="center"
      >
        {status ? 'Offline' : 'Online'}
      </Typography>
    </>
  )
}

const Timer = ({ device }) => {
  const lastSeen = new Date(device.last_seen * 1000)
  const [raidStart, setRaidStart] = useState(Utility.getTimeUntil(lastSeen))

  useEffect(() => {
    const timer = setTimeout(() => {
      setRaidStart(Utility.getTimeUntil(lastSeen))
    }, 1000)
    return () => clearTimeout(timer)
  })

  return (
    <Typography variant="caption">
      Last Seen: {lastSeen.toLocaleTimeString()} ({raidStart.str})
    </Typography>
  )
}
