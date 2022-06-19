import React from 'react'
import { Grid, Typography, Divider } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import Utility from '@services/Utility'

import TimeTile from './TimeTile'

export default function PowerUp({
  power_up_level,
  power_up_points,
  power_up_end_timestamp,
  divider,
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
