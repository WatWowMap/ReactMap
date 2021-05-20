/* eslint-disable camelcase */
import React, { useState, useEffect } from 'react'
import { Grid, Typography } from '@material-ui/core'
import { useMasterfile } from '../../hooks/useStore'
import Utility from '../../services/Utility'

export default function WeatherPopup({ weather }) {
  const { weatherTypes } = useMasterfile(state => state.masterfile)
  const { gameplay_condition, updated } = weather

  return (
    <Grid
      container
      direction="row"
      justify="center"
      alignItems="center"
      style={{ width: 150 }}
    >
      <Grid item xs={12}>
        <Typography variant="h6" align="center">
          {weatherTypes[gameplay_condition].name}
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="subtitle2" align="center">
          Last Updated:
        </Typography>
      </Grid>
      <Timer updated={updated} />
      <Grid item xs={12}>
        <Typography variant="subtitle2" align="center">
          Boosted Types:
        </Typography>
      </Grid>
      {weatherTypes[gameplay_condition].types.map(type => (
        <Grid item xs={4} key={type} style={{ textAlign: 'center' }}>
          <Typography variant="caption">
            {type}
          </Typography>
          <img
            src={`images/type/${type.toLowerCase()}.png`}
            style={{
              maxWidth: 30,
              maxHeight: 30,
            }}
          />
        </Grid>
      ))}
    </Grid>
  )
}

const Timer = ({ updated }) => {
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
          {lastUpdated.toLocaleTimeString()}
        </Typography>
      </Grid>
      <Grid item xs={timer.diff > 60 ? 12 : 4}>
        <Typography
          variant="subtitle2"
          align="center"
          gutterBottom
          style={{ color }}
        >
          ({timer.str})
        </Typography>
      </Grid>
    </>
  )
}
