import React from 'react'
import { withRouter } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Grid, Button, Icon, Typography,
} from '@material-ui/core'

const Login = ({ clickedTwice, location }) => {
  const { t } = useTranslation()

  return (
    <Grid
      container
      direction="column"
      justifyContent="center"
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
      {clickedTwice && (
        <Grid item style={{ whiteSpace: 'pre-line' }}>
          <Typography style={{ color: 'white', margin: 20 }} align="center">
            {location.state ? t(location.state.message) : t('clickOnce')}
          </Typography>
        </Grid>
      )}
    </Grid>
  )
}

export default withRouter(Login)
