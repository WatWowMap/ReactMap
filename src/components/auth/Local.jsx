import * as React from 'react'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import Grid from '@mui/material/Unstable_Grid2'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import OutlinedInput from '@mui/material/OutlinedInput'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import { useTranslation } from 'react-i18next'
import { useLazyQuery } from '@apollo/client'

import { login } from '@services/fetches'
import { Query } from '@services/Query'

/**
 *
 * @param {{ href?: string, sx?: import("@mui/material").SxProps, style?: React.CSSProperties }} props
 * @returns
 */
export function LocalLogin({ href, sx, style }) {
  const { t } = useTranslation()
  const [user, setUser] = React.useState({
    username: '',
    password: '',
    showPassword: false,
  })
  const [error, setError] = React.useState('')
  const [submitted, setSubmitted] = React.useState(false)
  const [checkUsername, { data }] = useLazyQuery(Query.user('CHECK_USERNAME'))

  const handleChange = (e) => {
    if (e.target.name === 'username') {
      checkUsername({ variables: { username: e.target.value } })
    }
    setUser({ ...user, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitted(true)
    const resp = await login(user, href)
    if (!resp.ok) {
      setError(t('localauth_failed'))
      setSubmitted(false)
    } else if (resp.url.includes('invalid_credentials')) {
      setError(t('invalid_credentials'))
      setSubmitted(false)
    } else {
      window.location.replace('/')
    }
  }

  return (
    <Box sx={sx} style={style}>
      <form onSubmit={handleSubmit}>
        <Grid
          container
          justifyContent="center"
          alignItems="center"
          direction="column"
          spacing={2}
        >
          <Grid textAlign="center">
            <FormControl variant="outlined" color="secondary" size="small">
              <InputLabel htmlFor="username">{t('local_username')}</InputLabel>
              <OutlinedInput
                id="username"
                name="username"
                type="text"
                value={user.username}
                onChange={handleChange}
                autoComplete="username"
                label={t('local_username')}
                color="secondary"
                style={{ width: 250 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit(e)
                }}
              />
            </FormControl>
          </Grid>
          <Grid textAlign="center">
            <FormControl variant="outlined" color="secondary" size="small">
              <InputLabel htmlFor="password">{t('local_password')}</InputLabel>
              <OutlinedInput
                id="password"
                name="password"
                type={user.showPassword ? 'text' : 'password'}
                value={user.password}
                onChange={handleChange}
                autoComplete="current-password"
                color="secondary"
                label={t('local_password')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit(e)
                }}
                style={{ width: 250 }}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
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
          <Grid textAlign="center">
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={!user.username || !user.password || submitted}
            >
              {(() => {
                if (!user.username && !user.password) {
                  return `${t('login')}/${t('register')}`
                }
                if (data?.checkUsername) {
                  return t('login')
                }
                return t('register')
              })()}
            </Button>
          </Grid>
        </Grid>
      </form>
      <Collapse in={!!error}>
        <Typography variant="subtitle2" align="center" color="error" my={2}>
          {error}
        </Typography>
      </Collapse>
    </Box>
  )
}
