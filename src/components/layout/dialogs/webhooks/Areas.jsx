import React, { memo } from 'react'
import { Done, Clear } from '@material-ui/icons'
import {
  Grid, Typography, Chip, Button,
} from '@material-ui/core'

import useStyles from '@hooks/useStyles'

const Areas = ({
  setWebhookMode, t, selectedAreas, webhookData, syncWebhook, selectedWebhook,
}) => {
  const classes = useStyles()

  const handleClick = areaName => {
    areaName = areaName.toLowerCase()
    const newAreas = selectedAreas.includes(areaName)
      ? selectedAreas.filter(a => a !== areaName)
      : [...selectedAreas, areaName]

    syncWebhook({
      variables: {
        category: 'setAreas',
        data: newAreas,
        name: selectedWebhook,
        status: 'POST',
      },
    })
  }

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
        {webhookData.areas.map(area => {
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
              onClick={() => handleClick(area)}
              onDelete={() => handleClick(area)}
              style={{ margin: 3 }}
            />
          )
        })}
      </Grid>
    </Grid>
  )
}

const areEqual = (prev, next) => (
  prev.selectedAreas.length === next.selectedAreas.length
  && prev.currentHuman.area === next.currentHuman.area
)

export default memo(Areas, areEqual)
