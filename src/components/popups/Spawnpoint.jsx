import React from 'react'
import { Typography } from '@material-ui/core'

export default function SpawnpointPopup({ spawnpoint }) {
  const {
    despawn_sec: despawn, lat, lon, updated,
  } = spawnpoint

  return (
    <>
      <Typography variant="h5" align="center">Spawnpoint</Typography>
      <Typography variant="h6" align="center">
        {despawn ? `00:${Math.round(despawn / 60)}` : '?'}
      </Typography>
      <Typography variant="subtitle1">
        Last Updated: {(new Date(updated * 1000)).toLocaleTimeString()}
      </Typography>
      <Typography variant="caption">
        Location:<br />
        {lat},<br />
        {lon}
      </Typography>
    </>
  )
}
