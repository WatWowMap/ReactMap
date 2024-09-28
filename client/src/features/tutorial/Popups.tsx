import DialogContent from '@mui/material/DialogContent'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Unstable_Grid2'
import { useTranslation } from 'react-i18next'
import { useMemory } from '@store/useMemory'
import { PokemonPopup } from '@features/pokemon'

import { tutorialData } from './data'

export function TutorialPopup({ isMobile }: { isMobile: boolean }) {
  const { t } = useTranslation()
  const { startLat, startLon } = useMemory((s) => s.config.general)
  const ts = Math.floor(new Date().getTime() / 1000)
  const size = isMobile ? 'subtitle2' : 'subtitle1'

  return (
    <DialogContent>
      <Grid
        container
        alignItems="center"
        height="100%"
        justifyContent="center"
        spacing={2}
      >
        <Grid whiteSpace="pre-line" xs={12}>
          <Typography gutterBottom align="center" variant="h6">
            {t('tutorial_popup_0')}
          </Typography>
          <Divider light style={{ margin: 10 }} />
          <Typography gutterBottom align="center" variant={size}>
            {t('tutorial_popup_1')}
          </Typography>
        </Grid>
        <Grid className="flex-center" sm={10} textAlign="center" xs={12}>
          <div className="leaflet-popup-content-wrapper" style={{ width: 230 }}>
            <div className="leaflet-popup-content">
              <PokemonPopup
                isTutorial
                iconUrl="https://raw.githubusercontent.com/WatWowMap/wwm-uicons-webp/main/pokemon/16.webp"
                pokemon={{
                  ...tutorialData.pokemon,
                  expire_timestamp: ts + 1800,
                  updated: ts + 100,
                  first_seen_timestamp: ts,
                  lat: startLat,
                  lon: startLon,
                }}
              />
            </div>
          </div>
        </Grid>
        <Grid whiteSpace="pre-line" xs={12}>
          <Typography gutterBottom align="center" variant={size}>
            {t('tutorial_popup_2')}
          </Typography>
          <Divider light style={{ margin: 10 }} />
          <Typography gutterBottom align="center" variant={size}>
            {t('tutorial_popup_3')}
          </Typography>
        </Grid>
      </Grid>
    </DialogContent>
  )
}
