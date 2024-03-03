// @ts-check
import * as React from 'react'
import Typography from '@mui/material/Typography'

/**
 *
 * @param {{ lat: number, lon: number }} props
 * @returns
 */
export default function Coords({ lat, lon }) {
  return (
    <Typography variant="caption" style={{ textAlign: 'center' }}>
      🎯 {lat}, {lon}
    </Typography>
  )
}
