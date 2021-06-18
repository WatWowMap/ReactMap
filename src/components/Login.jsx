import React, { useState } from 'react'
import { withRouter } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Grid, Button, Icon, Typography, TextField,
} from '@material-ui/core'
import Axios from 'axios'

const Login = ({ serverSettings, clickedTwice, location }) => {
  const { t } = useTranslation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const validateForm = async () => {
    if (username.length === 0 || password.length === 0) return
    Axios({
      method: 'POST',
      data: {
        username,
        password,
      },
      withCredentials: true,
      url: '/auth/local',
    })
  }

  return (
    <Grid
      container
      direction="column"
      justify="center"
      alignItems="center"
      style={{ minHeight: '95vh' }}
    >
      {serverSettings.enabledAuthMethods.includes('customAuth') && (
        <Grid
          item
          justify="center"
          align="center"
          style={{ backgroundColor: 'white', margin: 20, borderRadius: 5 }}
        >
          <Grid item>
            <TextField
              id="username"
              label={t('username')}
              variant="outlined"
              style={{ margin: '20px 20px 10px' }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </Grid>
          <Grid item>
            <TextField
              id="password"
              label={t('password')}
              type="password"
              variant="outlined"
              style={{ margin: '10px 20px' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              style={{
                backgroundColor: 'rgb(255,153,0)',
                color: 'white',
                margin: '10px 10px 20px',
              }}
              size="large"
              onClick={validateForm}
              href="/"
            >
              <Typography variant="h6" align="center">
                {t('login')}
              </Typography>
            </Button>
          </Grid>
        </Grid>
      )}
      {serverSettings.enabledAuthMethods.includes('customAuth')
      && serverSettings.enabledAuthMethods.includes('discord') && (
        <Grid item style={{ whiteSpace: 'pre-line' }}>
          <Typography style={{ color: 'white', margin: 20 }} align="center">
            {t('orUseDiscord')}
          </Typography>
        </Grid>
      )}
      {serverSettings.enabledAuthMethods.includes('discord') && (
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
      )}
      {serverSettings.enabledAuthMethods.includes('discord') && clickedTwice && (
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
