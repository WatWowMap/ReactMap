import React, { memo, useEffect, useMemo } from 'react'
import Done from '@mui/icons-material/Done'
import Clear from '@mui/icons-material/Clear'
import { Grid, Typography, Chip, Button, Divider } from '@mui/material'

import { Trans } from 'react-i18next'

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
  const byGroupProperty = useMemo(
    () =>
      webhookData.areas.features.reduce((acc, cur) => {
        const { group } = cur.properties
        if (!acc[group]) {
          acc[group] = []
        }
        acc[group].push(cur)
        return acc
      }, {}),
    [webhookData.areas.features.length],
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
      <Grid item container xs={12} alignItems="center" justifyContent="center">
        {Object.entries(byGroupProperty).map(([group, features]) => {
          const filtered = features.filter((feature) =>
            webhookData.available.includes(feature.properties.name),
          )
          return (
            <Grid item xs={12} key={group}>
              <Divider style={{ margin: '20px 0' }} />
              <Typography variant="h4" gutterBottom>
                {group}
              </Typography>
              {filtered.map((feature) => {
                const { name } = feature.properties
                const included = selectedAreas.includes(name.toLowerCase())
                return (
                  <Chip
                    key={`${group}_${name}`}
                    label={name}
                    clickable
                    variant={included ? 'default' : 'outlined'}
                    deleteIcon={included ? <Done /> : <Clear />}
                    size={isMobile ? 'small' : 'medium'}
                    color={included ? 'secondary' : 'primary'}
                    onClick={() => handleClick(name)}
                    onDelete={() => handleClick(name)}
                    style={{ margin: 3 }}
                  />
                )
              })}
            </Grid>
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
