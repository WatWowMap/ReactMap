import React from 'react'
import {
  Grid, DialogContent, Typography, Fab, Divider,
} from '@material-ui/core'
import { Menu } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

export default function TutSidebar({ isMobile, pokemon }) {
  const { t } = useTranslation()

  return (
    <DialogContent>
      <Grid
        container
        direction="row"
        alignItems="center"
        justify="center"
        spacing={2}
      >
        {!pokemon && (
          <>
            <Grid item xs={8}>
              <Typography variant={isMobile ? 'subtitle2' : 'h6'} align="center">
                {t('tutorialSidebar')}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Fab color="primary">
                <Menu />
              </Fab>
            </Grid>
            <Grid item xs={12}>
              <Divider light />
            </Grid>
          </>
        )}
        <Grid item xs={12} style={{ whiteSpace: 'pre-line' }}>
          <Typography variant="subtitle1" align="center" gutterBottom>
            {t(pokemon ? 'tutorialSidebarPokemon' : 'tutorialSidebarAll')}
          </Typography>
        </Grid>
        <Grid item xs={12} style={{ textAlign: 'center' }}>
          <img src={`/images/tutorial/sidebar_${pokemon ? 'pokemon' : 'all'}.png`} style={{ border: 'black 4px solid', borderRadius: 20 }} />
        </Grid>
        <Grid item xs={12} style={{ whiteSpace: 'pre-line' }}>
          <Typography variant="subtitle1" align="center" gutterBottom>
            {t(pokemon ? 'tutorialSidebarPokemon2' : 'tutorialSidebarAll2')}
          </Typography>
        </Grid>
      </Grid>
    </DialogContent>
  )
}
