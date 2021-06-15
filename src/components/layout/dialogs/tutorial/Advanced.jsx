import React, { useState } from 'react'
import {
  Grid, DialogContent, Typography, Divider, Button,
} from '@material-ui/core'
import {
  Tune, Ballot, Check, Clear, Save, HelpOutline, FormatSize,
} from '@material-ui/icons'
import { useTranslation } from 'react-i18next'

export default function TutAdvanced({ isMobile, toggleHelp, category }) {
  const { t } = useTranslation()
  const [isPokemon, setIsPokemon] = useState(category === 'pokemon')

  return (
    <DialogContent style={{ marginTop: 5 }}>
      <Grid
        container
        direction="row"
        alignItems="center"
        justify="center"
        spacing={1}
      >
        <Grid item xs={12} style={{ textAlign: 'center' }}>
          <Typography variant="caption" style={{ whiteSpace: 'pre-line' }}>
            {t('tutorialToggle')}
          </Typography>
          <br />
          <img src={`/images/tutorial/filters_${isPokemon ? 'pokemon' : 'all'}.png`} style={{ border: 'black 4px solid', borderRadius: 20 }} />
          <br />
          <Typography variant="caption" style={{ whiteSpace: 'pre-line' }}>
            {isPokemon ? t('tutorialPokemonCaption') : t('tutorialAllCaption')}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Divider light />
        </Grid>
        <Grid item xs={3} sm={4} style={{ textAlign: 'center' }}>
          {isMobile ? <HelpOutline style={{ color: 'white' }} /> : <Typography>{t('help')}</Typography>}
        </Grid>
        <Grid item xs={9} sm={8}>
          <Typography variant="subtitle2" align="center">
            {t('tutorialHelp')}
          </Typography>
        </Grid>
        <Grid item xs={3} sm={4} style={{ textAlign: 'center' }}>
          <Ballot style={{ color: 'white' }} />
        </Grid>
        <Grid item xs={9} sm={8}>
          <Typography variant="subtitle2" align="center">
            {t('tutorialAdvFilter')}
          </Typography>
        </Grid>
        {isPokemon ? (
          <>
            <Grid item xs={3} sm={4} style={{ textAlign: 'center' }}>
              {isMobile ? <Tune style={{ color: 'white' }} /> : <Typography>{t('applyToAll')}</Typography>}
            </Grid>
            <Grid item xs={9} sm={8}>
              <Typography variant="subtitle2" align="center">
                {t('tutorialTune')}
              </Typography>
            </Grid>
          </>
        ) : (
          <>
            <Grid item xs={3} sm={4} style={{ textAlign: 'center' }}>
              {isMobile ? <FormatSize style={{ color: 'white' }} /> : <Typography>{t('applyToAll')}</Typography>}
            </Grid>
            <Grid item xs={9} sm={8}>
              <Typography variant="subtitle2" align="center">
                {t('tutorialFormatSize')}
              </Typography>
            </Grid>
          </>
        )}
        <Grid item xs={3} sm={4} style={{ textAlign: 'center' }}>
          {isMobile ? <Clear color="primary" /> : <Typography color="primary">{t('disableAll')}</Typography>}
        </Grid>
        <Grid item xs={9} sm={8}>
          <Typography variant="subtitle2" align="center">
            {t('tutorialClear')}
          </Typography>
        </Grid>
        <Grid item xs={3} sm={4} style={{ color: '#00e676', textAlign: 'center' }}>
          {isMobile ? <Check /> : <Typography>{t('enableAll')}</Typography>}
        </Grid>
        <Grid item xs={9} sm={8}>
          <Typography variant="subtitle2" align="center">
            {t('tutorialCheck')}
          </Typography>
        </Grid>
        <Grid item xs={3} sm={4} style={{ textAlign: 'center' }}>
          {isMobile ? <Save color="secondary" /> : <Typography color="secondary">{t('save')}</Typography>}
        </Grid>
        <Grid item xs={9} sm={8}>
          <Typography variant="subtitle2" align="center">
            {t('tutorialSave')}
          </Typography>
        </Grid>
        {category ? (
          <Grid item xs={12} style={{ textAlign: 'right' }}>
            <Button onClick={toggleHelp} color="secondary" size="small">
              {t('close')}
            </Button>
          </Grid>
        ) : (
          <Grid item xs={12} style={{ textAlign: 'center' }}>
            <Button onClick={() => setIsPokemon(!isPokemon)} variant="contained" color="primary" size="small">
              {isPokemon ? t('tutorialShowAllView') : t('tutorialShowPokemonView')}
            </Button>
          </Grid>
        )}
      </Grid>
    </DialogContent>
  )
}
