/* eslint-disable camelcase */
import React, { useState } from 'react'
import { Grid, Typography, Divider } from '@material-ui/core'
import Utility from '@services/Utility'

export default function NestPopup({ nest, iconUrl, pokemon }) {
  const [parkName, setParkName] = useState(true)
  const {
    name, updated, pokemon_avg,
  } = nest

  const lastUpdated = Utility.getTimeUntil((new Date(updated * 1000)))

  const getColor = (timeSince) => {
    let color = '#00e676'
    if (timeSince > 604800) {
      color = '#ffeb3b'
    }
    if (timeSince > 1209600) {
      color = '#ff5722'
    }
    return color
  }

  return (
    <Grid
      container
      justify="center"
      alignItems="center"
      style={{ width: 200 }}
      spacing={1}
    >
      <Grid item xs={12}>
        <Typography
          variant={name.length > 20 ? 'subtitle2' : 'h6'}
          align="center"
          noWrap={parkName}
          onClick={() => setParkName(!parkName)}
        >
          {name}
        </Typography>
      </Grid>
      <Grid item xs={6} style={{ textAlign: 'center' }}>
        <img
          src={iconUrl}
          style={{
            maxHeight: 75,
            maxWidth: 75,
          }}
        />
        <br />
        <Typography variant="caption">
          {pokemon.name}
        </Typography>
      </Grid>
      <Grid item xs={6} style={{ textAlign: 'center' }}>
        <Typography variant="subtitle2">
          Last Updated:
        </Typography>
        <Typography variant={lastUpdated.str.includes('d') ? 'h6' : 'subtitle2'} style={{ color: getColor(lastUpdated.diff) }}>
          {lastUpdated.str}
        </Typography>
        <Typography variant="subtitle2">
          ~{pokemon_avg} spawns/hr
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Divider style={{ color: 'white', margin: 4 }} />
      </Grid>
      <Grid item xs={12} style={{ textAlign: 'center' }}>
        <Typography variant="caption">
          Nest Data is Estimated!<br />
          Verify by Checking Current Spawns
        </Typography>
      </Grid>
    </Grid>
  )
}
