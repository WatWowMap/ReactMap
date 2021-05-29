import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Grid, Button, Icon, Typography,
} from '@material-ui/core'

export default function Login({ failed }) {
  const { t } = useTranslation()

  return (
    <Grid
      container
      direction="column"
      justify="center"
      alignItems="center"
      style={{ minHeight: '95vh' }}
    >
      <Grid item>
        <Button
          variant="contained"
          style={{
            backgroundColor: 'rgb(114,136,218)',
            color: 'white',
          }}
          size="large"
          href="/auth/discord"
        >
          <Icon className="fab fa-discord" style={{ fontSize: 30 }} />&nbsp;
          <Typography variant="h6" align="center">
            {t('login')}
          </Typography>
        </Button>
      </Grid>
      {failed && (
        <Grid item>
          <Typography style={{ color: 'white', margin: 20 }} align="center">
            {t('clickOnce')}
          </Typography>
        </Grid>
      )}
    </Grid>
  )
}
