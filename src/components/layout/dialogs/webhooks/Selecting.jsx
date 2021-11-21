import React from 'react'
import { Grid, Fab, Typography } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

export default function Selecting({ setSelected, handleAll, deleteAll }) {
  const { t } = useTranslation()
  return (
    <Grid
      container
      justifyContent="center"
      alignItems="center"
      style={{ position: 'absolute', bottom: 0, width: '100%' }}
    >
      <Grid item xs={3} sm={2} style={{ textAlign: 'center' }}>
        <Fab
          size="small"
          color="secondary"
          variant="extended"
          onClick={() => setSelected({})}
        >
          <Typography variant="caption">
            {t('cancel')}
          </Typography>
        </Fab>
      </Grid>
      <Grid item xs={4} sm={3} md={2} style={{ textAlign: 'center' }}>
        <Fab
          size="small"
          color="secondary"
          variant="extended"
          onClick={handleAll}
        >
          <Typography variant="caption">
            {t('select_all')}
          </Typography>
        </Fab>
      </Grid>
      <Grid item xs={5} sm={4} md={3} style={{ textAlign: 'center' }}>
        <Fab
          size="small"
          color="primary"
          variant="extended"
          onClick={deleteAll}
        >
          <Typography variant="caption">
            {t('delete_all')}
          </Typography>
        </Fab>
      </Grid>
    </Grid>
  )
}
