import React from 'react'
import {
  Grid, DialogContent, Typography, Divider,
} from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import { useStatic } from '@hooks/useStore'
import PokemonPopup from '@components/popups/Pokemon'
import data from './data.json'

export default function TutPopup({ isMobile }) {
  const { t } = useTranslation()
  const ts = Math.floor((new Date()).getTime() / 1000)
  const { map: { startLat, startLon } } = useStatic(state => state.config)
  const size = isMobile ? 'subtitle2' : 'subtitle1'

  return (
    <DialogContent>
      <Grid
        container
        direction="column"
        justify="space-evenly"
        alignItems="center"
        spacing={2}
      >
        <Grid item xs={12} style={{ whiteSpace: 'pre-line' }}>
          <Typography variant="h6" align="center" gutterBottom>
            {t('tutorialPopup0')}
          </Typography>
          <Divider light style={{ margin: 10 }} />
          <Typography variant={size} align="center" gutterBottom>
            {t('tutorialPopup1')}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={10} style={{ textAlign: 'center' }}>
          <div className="leaflet-popup-content-wrapper">
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
                iconUrl="https://mygod.github.io/pokicons/v2/16.png"
                userSettings={{ prioritizePvpInfo: false }}
              />
            </div>
          </div>
        </Grid>
        <Grid item xs={12} style={{ whiteSpace: 'pre-line' }}>
          <Typography variant={size} align="center" gutterBottom>
            {t('tutorialPopup2')}
          </Typography>
          <Divider light style={{ margin: 10 }} />
          <Typography variant={size} align="center" gutterBottom>
            {t('tutorialPopup3')}
          </Typography>
        </Grid>
      </Grid>
    </DialogContent>
  )
}
