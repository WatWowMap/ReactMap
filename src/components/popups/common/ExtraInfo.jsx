// @ts-check
import * as React from 'react'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import { useTranslation } from 'react-i18next'

/**
 *
 * @param {{ title?: string, data?: React.ReactNode, children?: React.ReactNode }} props
 * @returns
 */
export const ExtraInfo = ({ title, data, children }) => {
  const { t } = useTranslation()

  return (
    <Grid container item xs={6} direction="column" textAlign="center">
      {title && (
        <Grid item>
          <Typography variant="subtitle2">{t(title)}:</Typography>
        </Grid>
      )}
      {data && (
        <Grid item>
          <Typography variant="caption">{data}</Typography>
        </Grid>
      )}
      {children}
    </Grid>
  )
}
