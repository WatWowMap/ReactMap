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
        alignItems="center"
        direction="row"
        justifyContent="center"
        style={{ width: 150 }}
      >
        <Grid xs={12}>
          <Typography align="center" variant="h6">
            {t(`weather_${gameplay_condition}`)}
          </Typography>
        </Grid>
        <Grid xs={12}>
          <Typography align="center" variant="subtitle2">
            {t('last_updated')}:
          </Typography>
        </Grid>
        <Timer updated={updated} />
        <Grid xs={12}>
          <Typography align="center" variant="subtitle2">
            {t('boosted_types')}:
          </Typography>
        </Grid>
        {weatherTypes.map((type) => (
          <Grid key={type} textAlign="center" xs={4}>
            <Typography variant="caption">{t(`poke_type_${type}`)}</Typography>
            <img
              alt={t(`weather_${gameplay_condition}`)}
              src={Icons.getTypes(type)}
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
          gutterBottom
          align="center"
          sx={{ color }}
          variant="subtitle2"
        >
          {dayCheck(ts, updated)}
        </Typography>
      </Grid>
      <Grid xs={timer.diff > 60 ? 12 : 4}>
        <Typography
          gutterBottom
          align="center"
          sx={{ color }}
          variant="subtitle2"
        >
          ({timer.str.replace('days', t('days')).replace('day', t('day'))})
        </Typography>
      </Grid>
    </>
  )
}
