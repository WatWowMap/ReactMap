import React, { useEffect } from 'react'
import { Done, Clear } from '@material-ui/icons'
import {
  Grid, Typography, Chip, Button,
} from '@material-ui/core'

import useStyles from '@hooks/useStyles'

export default function Areas({
  areas, profileData, humanData, setWebhookMode, t, selectedAreas, setSelectedAreas,
}) {
  const classes = useStyles()

  const handleClick = (event, del) => {
    const name = del
      ? event.toLowerCase()
      : event.target.innerText.toLowerCase()
    if (selectedAreas.includes(name)) {
      setSelectedAreas(selectedAreas.filter((a) => a !== name))
    } else {
      setSelectedAreas([...selectedAreas, name])
    }
  }

  useEffect(() => {
    setSelectedAreas(JSON.parse(profileData.find((p) => p.profile_no === humanData.current_profile_no).area))
  }, [])

  return (
    <Grid
      container
      item
      xs={12}
      sm={6}
      justifyContent="center"
      alignItems="center"
      spacing={2}
    >
      <Grid item xs={6} sm={5}>
        <Typography variant="h6">
          {t('areas')}
        </Typography>
      </Grid>
      <Grid item xs={6} sm={7} style={{ textAlign: 'right' }}>
        <Button size="small" variant="contained" color="primary" onClick={() => setWebhookMode('areas')}>
          {t('chooseOnMap')}
        </Button>
      </Grid>
      <Grid
        item
        xs={12}
        className={classes.areaChips}
      >
        {areas.map(area => {
          const included = selectedAreas.includes(area.toLowerCase())
          return (
            <Chip
              key={area}
              label={area}
              clickable
              variant={included ? 'default' : 'outlined'}
              deleteIcon={included ? <Done /> : <Clear />}
              size="small"
              color={included ? 'secondary' : 'primary'}
              onClick={handleClick}
              onDelete={() => handleClick(area, true)}
              style={{ margin: 3 }}
            />
          )
        })}
      </Grid>
    </Grid>
  )
}
