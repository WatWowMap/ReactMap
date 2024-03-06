// @ts-check
import React from 'react'
import DialogContent from '@mui/material/DialogContent'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import { useTranslation } from 'react-i18next'

import { useMemory } from '@store/useMemory'
import { PokemonPopup } from '@features/pokemon'
import data from './data'

export default function TutPopup({ isMobile }) {
  const { t } = useTranslation()
  const { startLat, startLon } = useMemory((state) => state.config.general)
  const ts = Math.floor(new Date().getTime() / 1000)
  const size = isMobile ? 'subtitle2' : 'subtitle1'

  return (
    <DialogContent>
      <Grid
        container
        justifyContent="center"
        alignItems="center"
        spacing={2}
        style={{ height: '100%' }}
      >
        <Grid item xs={12} style={{ whiteSpace: 'pre-line' }}>
          <Typography variant="h6" align="center" gutterBottom>
            {t('tutorial_popup_0')}
          </Typography>
          <Divider light style={{ margin: 10 }} />
          <Typography variant={size} align="center" gutterBottom>
            {t('tutorial_popup_1')}
          </Typography>
        </Grid>
        <Grid
          item
          xs={12}
          sm={10}
          style={{
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="leaflet-popup-content-wrapper" style={{ width: 230 }}>
            <div className="leaflet-popup-content">
              <PokemonPopup
                pokemon={{
                  ...data.pokemon,
                  expire_timestamp: ts + 1800,
                  updated: ts + 100,
                  first_seen_timestamp: ts,
                  lat: startLat,
                  lon: startLon,
                }}
                iconUrl="https://raw.githubusercontent.com/WatWowMap/wwm-uicons-webp/main/pokemon/16.webp"
                isTutorial
              />
            </div>
          </div>
        </Grid>
        <Grid item xs={12} style={{ whiteSpace: 'pre-line' }}>
          <Typography variant={size} align="center" gutterBottom>
            {t('tutorial_popup_2')}
          </Typography>
          <Divider light style={{ margin: 10 }} />
          <Typography variant={size} align="center" gutterBottom>
            {t('tutorial_popup_3')}
          </Typography>
        </Grid>
      </Grid>
    </DialogContent>
  )
}
