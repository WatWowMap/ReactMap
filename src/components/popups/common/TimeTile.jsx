import React from 'react'
import { Grid, Typography } from '@material-ui/core'

import Timer from './Timer'

export default function TimeTile({ expireTime, icon, until, size = 3 }) {
  const endTime = new Date(expireTime * 1000)

  return (
    <>
      {icon && (
        <Grid item xs={size} style={{ textAlign: 'center' }}>
          {typeof icon === 'string'
            ? <img src={icon} className="quest-popup-img" alt={icon} /> : icon}
        </Grid>
      )}
      {endTime && (
        <Grid item xs={icon ? 12 - size : 12} style={{ textAlign: 'center' }}>
          <Timer expireTime={expireTime} until={until} />
          <Typography variant="caption">
            {new Date(endTime).toLocaleTimeString(localStorage.getItem('i18nextLng') || 'en')}
          </Typography>
        </Grid>
      )}
    </>
  )
}
