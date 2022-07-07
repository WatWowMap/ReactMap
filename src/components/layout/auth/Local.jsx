import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Grid,
  Typography,
  Button,
  OutlinedInput,
  InputLabel,
  FormControl,
  InputAdornment,
  IconButton,
} from '@material-ui/core'
import { Visibility, VisibilityOff } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@apollo/client'

import Fetch from '@services/Fetch'
import Query from '@services/Query'

export default function LocalLogin({
  href,
  serverSettings,
  getServerSettings,
}) {
  const { t } = useTranslation()
  const [user, setUser] = useState({
    username: '',
    password: '',
    showPassword: false,
  })
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [redirect, setRedirect] = useState(false)
  const [checkUsername, { data }] = useMutation(Query.user('checkUsername'))

  const handleChange = (e) => {
    if (e.target.name === 'username') {
      checkUsername({ variables: { username: e.target.value } })
    }
    setUser({ ...user, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitted(true)
    await Fetch.login(user, href).then(async (resp) => {
      if (!resp.ok) {
        setError(t(await resp.json()))
      }
      if (resp.redirected) {
        await getServerSettings()
        if (serverSettings.user.valid) {
          setRedirect(true)
        }
      }
    })
  }

  if (redirect) {
    return <Navigate push to="/" />
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Grid container justifyContent="center" alignItems="center" spacing={2}>
          <Grid item xs={12} sm={5} style={{ textAlign: 'center' }}>
            <FormControl variant="outlined" color="secondary">
              <InputLabel htmlFor="username">{t('local_username')}</InputLabel>
              <OutlinedInput
                id="username"
                name="username"
                type="text"
                value={user.username}
                onChange={handleChange}
                autoComplete="username"
                color="secondary"
                labelWidth={t('local_username').length * 9}
                style={{ width: 250 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit(e)
                }}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={5} style={{ textAlign: 'center' }}>
            <FormControl variant="outlined" color="secondary">
              <InputLabel htmlFor="password">{t('local_password')}</InputLabel>
              <OutlinedInput
                id="password"
                name="password"
                type={user.showPassword ? 'text' : 'password'}
                value={user.password}
                onChange={handleChange}
                autoComplete="current-password"
                color="secondary"
                labelWidth={t('local_password').length * 9}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit(e)
                }}
                style={{ width: 250 }}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      style={{ color: 'white' }}
                      name="showPassword"
                      onClick={() =>
                        setUser({ ...user, showPassword: !user.showPassword })
                      }
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {user.showPassword ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                  </InputAdornment>
                }
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2} style={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              style={{
                color: 'white',
                textAlign: 'center',
              }}
              color="primary"
              size="large"
              onClick={handleSubmit}
              disabled={!user.username || !user.password || submitted}
            >
              <Typography variant="subtitle2" align="center">
                {(() => {
                  if (!user.username && !user.password) {
                    return `${t('login')}/${t('register')}`
                  }
                  if (data?.checkUsername) {
                    return t('login')
                  }
                  return t('register')
                })()}
              </Typography>
            </Button>
          </Grid>
        </Grid>
      </form>
      <div style={{ margin: 20 }}>
        <Typography variant="subtitle2" align="center" color="error">
          {error}
        </Typography>
      </div>
    </>
  )
}
