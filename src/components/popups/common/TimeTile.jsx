import React from 'react'
import { Grid, Typography } from '@material-ui/core'

import Timer from './Timer'

export default function TimeUntil({ expireTime, icon, until }) {
  const endTime = new Date(expireTime * 1000)

  return (
    <>
      {icon && (
        <Grid item xs={3} style={{ textAlign: 'center' }}>
          <img src={icon} className="quest-popup-img" />
        </Grid>
      )}
      <Grid item xs={icon ? 9 : 12} style={{ textAlign: 'center' }}>
        <Timer expireTime={expireTime} until={until} />
        <Typography variant="caption">
          {new Date(endTime).toLocaleTimeString(localStorage.getItem('i18nextLng'))}
        </Typography>
      </Grid>
    </>
  )
}
