import React from 'react'
import { Typography } from '@mui/material'

export default function Coords({ lat, lon }) {
  return (
    <Typography variant="caption" style={{ textAlign: 'center' }}>
      🎯 {lat}, {lon}
    </Typography>
  )
}
