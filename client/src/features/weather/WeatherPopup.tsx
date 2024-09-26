import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { ErrorBoundary } from '@components/ErrorBoundary'
import { useAnalytics } from '@hooks/useAnalytics'
import { getTimeUntil } from '@utils/getTimeUntil'
import { dayCheck } from '@utils/dayCheck'

export function WeatherPopup({
  gameplay_condition,
  updated,
}: import('@rm/types').Weather) {
  const { t } = useTranslation()
  const weatherTypes = useMemory(
    (s) => s.masterfile.weather[gameplay_condition]?.types || [],
  )
  const Icons = useMemory((s) => s.Icons)

  useAnalytics(
    'Popup',
    `Type: ${t(`weather_${gameplay_condition}`)}`,
    'Weather',
  )

  return (
    <ErrorBoundary noRefresh variant="h5">
      <Grid
        container
        direction="row"
        justifyContent="center"
        alignItems="center"
        style={{ width: 150 }}
      >
        <Grid xs={12}>
          <Typography variant="h6" align="center">
            {t(`weather_${gameplay_condition}`)}
          </Typography>
        </Grid>
        <Grid xs={12}>
          <Typography variant="subtitle2" align="center">
            {t('last_updated')}:
          </Typography>
        </Grid>
        <Timer updated={updated} />
        <Grid xs={12}>
          <Typography variant="subtitle2" align="center">
            {t('boosted_types')}:
          </Typography>
        </Grid>
        {weatherTypes.map((type) => (
          <Grid xs={4} key={type} textAlign="center">
            <Typography variant="caption">{t(`poke_type_${type}`)}</Typography>
            <img
              src={Icons.getTypes(type)}
              alt={t(`weather_${gameplay_condition}`)}
              style={{
                maxWidth: 30,
                maxHeight: 30,
              }}
            />
          </Grid>
        ))}
      </Grid>
    </ErrorBoundary>
  )
}

const Timer = ({
  updated,
  ts = Date.now() / 1000,
}: {
  updated: number
  ts?: number
}) => {
  const { t } = useTranslation()
  const lastUpdated = new Date(updated * 1000)
  const [timer, setTimer] = React.useState(getTimeUntil(updated * 1000))

  const date = new Date()
  const currentHour = date.getHours()
  const updatedHour = lastUpdated.getHours()
  const currentDay = date.getDate()
  const updatedDay = lastUpdated.getDate()

  const color =
    updatedHour === currentHour && updatedDay === currentDay
      ? 'success.main'
      : 'error.main'

  React.useEffect(() => {
    const timer2 = setTimeout(() => {
      setTimer(getTimeUntil(updated * 1000))
    }, 1000)
    return () => clearTimeout(timer2)
  })

  return (
    <>
      <Grid xs={timer.diff > 60 ? 12 : 8}>
        <Typography
          variant="subtitle2"
          align="center"
          gutterBottom
          sx={{ color }}
        >
          {dayCheck(ts, updated)}
        </Typography>
      </Grid>
      <Grid xs={timer.diff > 60 ? 12 : 4}>
        <Typography
          variant="subtitle2"
          align="center"
          gutterBottom
          sx={{ color }}
        >
          ({timer.str.replace('days', t('days')).replace('day', t('day'))})
        </Typography>
      </Grid>
    </>
  )
}
