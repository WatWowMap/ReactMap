import React from 'react'
import { Grid, Fab } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

export default function Selecting({ setSelected, handleAll }) {
  const { t } = useTranslation()
  return (
    <Grid
      container
      justifyContent="center"
      alignItems="center"
      style={{ position: 'absolute', bottom: 0, width: '90%' }}
    >
      <Grid item xs={4} sm={2} style={{ textAlign: 'center' }}>
        <Fab
          size="small"
          color="secondary"
          variant="extended"
          onClick={() => setSelected({})}
        >
          {t('cancel')}
        </Fab>
      </Grid>
      <Grid item xs={4} sm={3} md={2} style={{ textAlign: 'center' }}>
        <Fab
          size="small"
          color="secondary"
          variant="extended"
          onClick={handleAll}
        >
          {t('selectAll')}
        </Fab>
      </Grid>
      <Grid item xs={4} sm={3} md={2} style={{ textAlign: 'center' }}>
        <Fab
          size="small"
          color="primary"
          variant="extended"
          onClick={handleAll}
        >
          {t('deleteAll')}
        </Fab>
      </Grid>
    </Grid>
  )
}
