import React from 'react'
import { Typography } from '@material-ui/core'

export default function Coords({ lat, lon }) {
  return (
    <Typography variant="caption" style={{ textAlign: 'center' }}>
      🎯 {lat}, {lon}
    </Typography>
  )
}
