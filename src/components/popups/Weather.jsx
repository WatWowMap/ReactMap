import React, { useState, useEffect } from 'react'
import { Grid, Typography } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import { useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'
import ErrorBoundary from '@components/ErrorBoundary'

export default function WeatherPopup({ weather, ts, Icons }) {
  const { t } = useTranslation()
  const { weather: weatherTypes } = useStatic((state) => state.masterfile)
  const { gameplay_condition, updated } = weather

  useEffect(() => {
    Utility.analytics(
      'Popup',
      `Type: ${t(`weather_${gameplay_condition}`)}`,
      'Weather',
    )
  }, [])

  return (
    <ErrorBoundary noRefresh style={{}} variant="h5">
      <Grid
        container
        direction="row"
        justifyContent="center"
        alignItems="center"
        style={{ width: 150 }}
      >
        <Grid item xs={12}>
          <Typography variant="h6" align="center">
            {t(`weather_${gameplay_condition}`)}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle2" align="center">
            {t('last_updated')}:
          </Typography>
        </Grid>
        <Timer updated={updated} ts={ts} t={t} />
        <Grid item xs={12}>
          <Typography variant="subtitle2" align="center">
            {t('boosted_types')}:
          </Typography>
        </Grid>
        {weatherTypes[gameplay_condition].types.map((type) => (
          <Grid item xs={4} key={type} style={{ textAlign: 'center' }}>
            <Typography variant="caption">{t(`poke_type_${type}`)}</Typography>
            <img
              src={Icons.getTypes(type)}
              alt={type}
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

const Timer = ({ updated, ts, t }) => {
  const lastUpdated = new Date(updated * 1000)
  const [timer, setTimer] = useState(Utility.getTimeUntil(lastUpdated))

  const date = new Date()
  const currentHour = date.getHours()
  const updatedHour = lastUpdated.getHours()
  const currentDay = date.getDate()
  const updatedDay = lastUpdated.getDate()

  let color = '#ff5722'
  if (updatedHour === currentHour && updatedDay === currentDay) {
    color = '#00e676'
  }

  useEffect(() => {
    const timer2 = setTimeout(() => {
      setTimer(Utility.getTimeUntil(lastUpdated))
    }, 1000)
    return () => clearTimeout(timer2)
  })

  return (
    <>
      <Grid item xs={timer.diff > 60 ? 12 : 8}>
        <Typography
          variant="subtitle2"
          align="center"
          gutterBottom
          style={{ color }}
        >
          {Utility.dayCheck(ts, updated)}
        </Typography>
      </Grid>
      <Grid item xs={timer.diff > 60 ? 12 : 4}>
        <Typography
          variant="subtitle2"
          align="center"
          gutterBottom
          style={{ color }}
        >
          ({timer.str.replace('days', t('days')).replace('day', t('day'))})
        </Typography>
      </Grid>
    </>
  )
}
