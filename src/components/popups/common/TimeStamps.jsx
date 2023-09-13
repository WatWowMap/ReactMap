// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import { useTranslation } from 'react-i18next'
import TimeSince from './Timer'

/**
 *
 * @param {{ time?: number, children: string }} props
 * @returns
 */
export const TimeStamp = ({ time, children }) => {
  const { t, i18n } = useTranslation()

  if (!time) return null

  const formatter = new Intl.DateTimeFormat(i18n.language, {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  })

  return (
    <Grid container item xs={6} direction="column" textAlign="center">
      <Grid item>
        <Typography variant="subtitle2">{t(children)}:</Typography>
      </Grid>
      <Grid item>
        <Typography variant="caption">
          {formatter.format(time * 1000)}
        </Typography>
      </Grid>
      <Grid item>
        <TimeSince expireTime={time} />
      </Grid>
    </Grid>
  )
}
