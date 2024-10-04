import * as React from 'react'
import Grid from '@mui/material/Unstable_Grid2'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import OutlinedInput, { OutlinedInputProps } from '@mui/material/OutlinedInput'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import { useTranslation } from 'react-i18next'
import { useLazyQuery } from '@apollo/client'
import { login } from '@services/fetches'
import { Query } from '@services/queries'
import { VisibleToggle } from '@components/inputs/VisibleToggle'

export function LocalLogin({
  href,
  sx,
  style,
}: {
  href?: string
  sx?: import('@mui/material').SxProps
  style?: React.CSSProperties
}) {
  const { t } = useTranslation()
  const [user, setUser] = React.useState({
    username: '',
    password: '',
    showPassword: false,
  })
  const [error, setError] = React.useState('')
  const [submitted, setSubmitted] = React.useState(false)
  const [checkUsername, { data }] = useLazyQuery(Query.user('CHECK_USERNAME'))

  const handleChange: OutlinedInputProps['onChange'] = (e) => {
    if (e.target.name === 'username') {
      checkUsername({ variables: { username: e.target.value } })
    }
    setUser({ ...user, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitted(true)
    const resp = await login(user, href)

    if ('ok' in resp && !resp.ok) {
      setError(t('localauth_failed'))
      setSubmitted(false)
    } else if ('url' in resp && resp.url.includes('invalid_credentials')) {
      setError(t('invalid_credentials'))
      setSubmitted(false)
    } else {
      window.location.replace('/')
    }
  }

  return (
    <Box style={style} sx={sx}>
      <form onSubmit={handleSubmit}>
        <Grid
          container
          alignItems="center"
          direction="column"
          justifyContent="center"
          spacing={2}
        >
          <Grid textAlign="center">
            <FormControl color="secondary" size="small" variant="outlined">
              <InputLabel htmlFor="username">{t('local_username')}</InputLabel>
              <OutlinedInput
                autoComplete="username"
                color="secondary"
                id="username"
                label={t('local_username')}
                name="username"
                style={{ width: 250 }}
                type="text"
                value={user.username}
                onChange={handleChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit(e)
                }}
              />
            </FormControl>
          </Grid>
          <Grid textAlign="center">
            <FormControl color="secondary" size="small" variant="outlined">
              <InputLabel htmlFor="password">{t('local_password')}</InputLabel>
              <OutlinedInput
                autoComplete="current-password"
                color="secondary"
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      name="showPassword"
                      onClick={() =>
                        setUser({ ...user, showPassword: !user.showPassword })
                      }
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <VisibleToggle visible={user.showPassword} />
                    </IconButton>
                  </InputAdornment>
                }
                id="password"
                label={t('local_password')}
                name="password"
                style={{ width: 250 }}
                type={user.showPassword ? 'text' : 'password'}
                value={user.password}
                onChange={handleChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit(e)
                }}
              />
            </FormControl>
          </Grid>
          <Grid textAlign="center">
            <Button
              color="primary"
              disabled={!user.username || !user.password || submitted}
              variant="contained"
              onClick={handleSubmit}
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
        <Typography align="center" color="error" my={2} variant="subtitle2">
          {error}
        </Typography>
      </Collapse>
    </Box>
  )
}
