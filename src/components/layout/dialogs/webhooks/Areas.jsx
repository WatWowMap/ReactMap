import React, { memo, useEffect } from 'react'
import Done from '@material-ui/icons/Done'
import Clear from '@material-ui/icons/Clear'
import { Grid, Typography, Chip, Button } from '@material-ui/core'

import { Trans } from 'react-i18next'

import useStyles from '@hooks/useStyles'

const Areas = ({
  webhookMode,
  setWebhookMode,
  t,
  selectedAreas,
  webhookData,
  syncWebhook,
  selectedWebhook,
  isMobile,
}) => {
  const classes = useStyles()

  const handleClick = (areaName) => {
    areaName = areaName.toLowerCase()
    let newAreas = []
    if (areaName === 'all') {
      newAreas = webhookData.available
    } else if (areaName === 'none') {
      newAreas = []
    } else {
      newAreas = selectedAreas.includes(areaName)
        ? selectedAreas.filter((a) => a !== areaName)
        : [...selectedAreas, areaName]
    }
    syncWebhook({
      variables: {
        category: 'setAreas',
        data: newAreas,
        name: selectedWebhook,
        status: 'POST',
      },
    })
  }

  useEffect(() => {
    if (webhookMode === 'areas') {
      syncWebhook({
        variables: {
          category: 'setAreas',
          data: selectedAreas,
          name: selectedWebhook,
          status: 'POST',
        },
      })
    }
  }, [selectedAreas])

  const ChooseOnMap = (
    <Grid item xs={6} sm={3} style={{ textAlign: 'center' }}>
      <Button
        size="small"
        variant="contained"
        color="primary"
        onClick={() => setWebhookMode('areas')}
      >
        {t('choose_on_map')}
      </Button>
    </Grid>
  )

  return (
    <Grid
      container
      item
      xs={12}
      justifyContent="center"
      alignItems="center"
      spacing={2}
      style={{ height: '100%' }}
    >
      <Grid item xs={6} sm={3}>
        <Typography variant="h6">{t('areas')}</Typography>
      </Grid>
      {isMobile && ChooseOnMap}
      <Grid item xs={6} sm={3} style={{ textAlign: 'center' }}>
        <Button
          size="small"
          variant="contained"
          color="primary"
          onClick={() => handleClick('none')}
        >
          {t('disable_all')}
        </Button>
      </Grid>
      <Grid item xs={6} sm={3} style={{ textAlign: 'center' }}>
        <Button
          size="small"
          variant="contained"
          color="secondary"
          onClick={() => handleClick('all')}
        >
          {t('enable_all')}
        </Button>
      </Grid>
      {!isMobile && ChooseOnMap}
      <Grid item xs={12} className={classes.areaChips}>
        {webhookData.available.map((area) => {
          const included = selectedAreas.includes(area.toLowerCase())
          return (
            <Chip
              key={area}
              label={area}
              clickable
              variant={included ? 'default' : 'outlined'}
              deleteIcon={included ? <Done /> : <Clear />}
              size={isMobile ? 'small' : 'medium'}
              color={included ? 'secondary' : 'primary'}
              onClick={() => handleClick(area)}
              onDelete={() => handleClick(area)}
              style={{ margin: 3 }}
            />
          )
        })}
      </Grid>
      <Grid item xs={12}>
        <Typography variant="h6" align="center">
          <Trans i18nKey="selected_areas" count={selectedAreas.length}>
            {{ amount: selectedAreas.length }}
          </Trans>
        </Typography>
      </Grid>
    </Grid>
  )
}

const areEqual = (prev, next) =>
  prev.selectedAreas.length === next.selectedAreas.length &&
  prev.currentHuman.area === next.currentHuman.area &&
  prev.isMobile === next.isMobile

export default memo(Areas, areEqual)
