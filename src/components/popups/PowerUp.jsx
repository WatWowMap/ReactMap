// @ts-check
import * as React from 'react'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'

import { Utility } from '@services/Utility'

import { TimeTile } from './TimeTile'

/**
 *
 * @param {{ power_up_level: number, power_up_points: number, power_up_end_timestamp: number, divider?: boolean }} props
 * @returns
 */
export function PowerUp({
  power_up_level,
  power_up_points,
  power_up_end_timestamp,
  divider = false,
}) {
  const { t } = useTranslation()
  if (!power_up_level) return null
  return (
    <Grid container alignItems="center" justifyContent="center">
      <TimeTile
        expireTime={power_up_end_timestamp}
        until
        size={5}
        icon={
          <>
            <Typography align="center" variant="subtitle2">
              {Utility.capitalize(t('level'))} {power_up_level}
            </Typography>
            <Typography variant="caption">
              {power_up_points} {t('points')}
            </Typography>
          </>
        }
      />
      {divider && <Divider light flexItem className="popup-divider" />}
    </Grid>
  )
}
