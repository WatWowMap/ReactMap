import React, { useState } from 'react'
import {
  Grid, Typography, Button, OutlinedInput, InputLabel, FormControl, InputAdornment, IconButton,
} from '@material-ui/core'
import { Visibility, VisibilityOff } from '@material-ui/icons'
import { useTranslation } from 'react-i18next'
import Fetch from '@services/Fetch'

export default function LocalLogin({ href }) {
  const { t } = useTranslation()
  const [user, setUser] = useState({
    username: '',
    password: '',
    showPassword: false,
  })
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await Fetch.login(user, href)
      .then(resp => {
        if (resp.ok) {
          window.location.reload()
        } else {
          setError(t('local_error'))
        }
      })
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Grid
          container
          justifyContent="center"
          alignItems="center"
          spacing={2}
        >
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
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e) }}
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
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e) }}
                style={{ width: 250 }}
                endAdornment={(
                  <InputAdornment position="end">
                    <IconButton
                      style={{ color: 'white' }}
                      name="showPassword"
                      onClick={() => setUser({ ...user, showPassword: !user.showPassword })}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {user.showPassword ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                  </InputAdornment>
                )}
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
              disabled={!user.username || !user.password}
            >
              <Typography variant="subtitle2" align="center">
                {t('login')}
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
