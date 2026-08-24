// @ts-check

import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Unstable_Grid2'
import { capitalize } from '@mui/material/utils'
import { useTranslation } from 'react-i18next'

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
        size={5}
        icon={
          <>
            <Typography align="center" variant="subtitle2">
              {capitalize(t('level'))} {power_up_level}
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
