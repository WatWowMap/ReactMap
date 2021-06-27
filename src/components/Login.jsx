/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable no-console */
import React, { useState } from 'react'
import { withRouter, Redirect } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Grid, Button, Icon, Typography, TextField, Dialog, Divider, DialogActions, DialogContent,
  DialogTitle, FormControl, Select, InputLabel,
} from '@material-ui/core'
import Axios from 'axios'
import Fetch from '@services/Fetch'

const Login = ({
  serverSettings, setServerSettings, clickedTwice, location,
}) => {
  const { t } = useTranslation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authenticationSuccess, setAuthenticationSuccess] = useState(false)
  const [authenticationMsg, setAuthenticationMsg] = useState('Error')
  const [authenticationMsgColor, setAuthenticationMsgColor] = useState('')
  const [authenticationMsgOpen, setAuthenticationMsgOpen] = React.useState(false)
  const [registerFormOpen, setRegisterFormOpen] = React.useState(false)
  const [registerUsername, setRegisterUsername] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerPasswordConfirmation, setRegisterPasswordConfirmation] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerDiscord, setRegisterDiscord] = useState('')
  const [registerArea, setRegisterArea] = useState('')
  const [registerFormErrorMsg, setRegisterFormErrorMsg] = useState('')
  const [registerFormSuccessMsg, setRegisterFormSuccessMsg] = useState('')

  const handleAuthenticationMsgClose = () => {
    setAuthenticationMsgOpen(false)
    setAuthenticationMsg('')
    setAuthenticationMsgColor('')
  }

  const handleRegisterFormOpen = () => {
    setRegisterFormOpen(true)
    setRegisterFormSuccessMsg('')
    setRegisterFormErrorMsg('')
  }

  const handleRegisterFormClose = () => {
    setRegisterFormOpen(false)
  }

  const refreshSettings = async () => {
    setServerSettings(await Fetch.getSettings())
    handleAuthenticationMsgClose()
    setAuthenticationSuccess(true)
  }

  const validateForm = async () => {
    if (username.length === 0 || password.length === 0) return
    const authentication = await Axios({
      method: 'POST',
      data: {
        username: username.toLowerCase(),
        password,
      },
      withCredentials: true,
      url: '/auth/local',
    }).then((response) => response.data)
    if (authentication.authenticationSuccess) {
      refreshSettings()
      setAuthenticationMsg(t('loginSuccess'))
    } else {
      setAuthenticationMsg(t(authentication.errorCode))
      setAuthenticationMsgColor('error')
    }
    setAuthenticationMsgOpen(true)
  }

  const validateRegisterForm = async () => {
    let errorMsg = ''
    let successMsg = ''
    if (registerPassword !== registerPasswordConfirmation) errorMsg = t('registerPasswordMismatch')
    if (registerUsername.length < 5) errorMsg = t('registerUsernameTooShort')
    const emailRegex = /^[a-z0-9._-]+@[a-z0-9._-]{2,}\.[a-z]{2,4}$/
    if (!emailRegex.test(registerEmail)
      || (serverSettings.disabledEmailDomains.length > 0
      && serverSettings.disabledEmailDomains.some(domain => registerEmail.toLowerCase().includes(domain.toLowerCase())))) errorMsg = t('registerInvalidEmail')
    const discordRegex = /^((?!(discordtag|everyone|here)#)((?!@|#|:|```).{2,32})#\d{4}$)/i
    if (registerDiscord && !discordRegex.test(registerDiscord)) errorMsg = t('registerInvalidDiscord')
    if (registerUsername.length === 0
        || registerPassword.length === 0
        || registerPasswordConfirmation.length === 0
        || registerEmail.length === 0
        || (serverSettings.manualAreas.length > 0 && registerArea.length === 0)) errorMsg = t('registerAllFieldsRequired')
    if (!errorMsg) {
      const registerConfirmationEmail = {}
      if (serverSettings.confirmationEmail) {
        registerConfirmationEmail.subject = t('registrationSubject')
        registerConfirmationEmail.text = t('registrationText')
        registerConfirmationEmail.html = t('registrationHtml')
      }
      const registration = await Axios({
        method: 'POST',
        data: {
          registerUsername: registerUsername.toLowerCase(),
          registerPassword,
          registerEmail: registerEmail.toLowerCase(),
          registerDiscord: registerDiscord.toLowerCase(),
          registerArea,
          registerConfirmationEmail,
        },
        withCredentials: true,
        url: '/auth/register',
      }).then((response) => response.data)
      if (registration.registrationSuccessful) {
        successMsg = t(registration.message)
      } else {
        errorMsg = t(registration.message)
      }
    }
    if (!errorMsg) {
      setRegisterUsername('')
      setRegisterPassword('')
      setRegisterPasswordConfirmation('')
      setRegisterEmail('')
      setRegisterDiscord('')
      setRegisterArea('')
    }
    setRegisterFormErrorMsg(errorMsg)
    setRegisterFormSuccessMsg(successMsg)
  }

  const registrationDestination = serverSettings.registrationExternalLink !== '' ? { href: '/register' } : { onClick: handleRegisterFormOpen }

  return (
    <Grid
      container
      direction="column"
      justify="center"
      alignItems="center"
      style={{ minHeight: '95vh' }}
    >
      {authenticationSuccess ? (<Redirect push to="/" />) : null}
      {serverSettings.enabledAuthMethods.includes('customAuth') && (
        <Grid
          item
          justify="center"
          align="center"
          style={{ backgroundColor: 'white', margin: 0, borderRadius: 5 }}
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
          <Typography style={{ color: 'white', margin: '40px 20px 20px' }} align="center">
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
      {serverSettings.enableRegistration && (
        <Grid item>
          <Button
            variant="contained"
            style={{
              backgroundColor: 'rgb(76,175,80)',
              color: 'white',
            }}
            size="large"
            {...registrationDestination}
          >
            <Typography variant="h6" align="center">
              {t('register')}
            </Typography>
          </Button>
        </Grid>
      )}
      <Dialog
        open={authenticationMsgOpen}
        onClose={handleAuthenticationMsgClose}
        maxWidth="xs"
      >
        <DialogTitle>{t('login')}</DialogTitle>
        <Divider />
        <DialogContent>
          <Typography variant="subtitle1" color={authenticationMsgColor} align="center">
            {authenticationMsg}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAuthenticationMsgClose} color="primary" autoFocus>
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={registerFormOpen}
        onClose={handleRegisterFormClose}
        maxWidth="xs"
      >
        <DialogTitle>{t('registration')}</DialogTitle>
        <DialogContent>
          {registerFormSuccessMsg !== '' ? (
            <Typography variant="subtitle1" align="center">
              {registerFormSuccessMsg}
            </Typography>
          ) : (
            <>
              <Typography variant="subtitle1" align="center">
                {t('fillRegistrationForm')}
              </Typography>
              <br />
              <Divider />
              <br />
              <Typography variant="subtitle1" color="error" align="center">
                {registerFormErrorMsg}
              </Typography>
              <Grid
                item
                justify="center"
                align="center"
              >
                <Grid item>
                  <TextField
                    id="registerUsername"
                    label={t('username')}
                    fullWidth="true"
                    margin="normal"
                    variant="outlined"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    required
                  />
                </Grid>
                <Grid item>
                  <TextField
                    id="registerPassword"
                    label={t('password')}
                    fullWidth="true"
                    margin="normal"
                    type="password"
                    variant="outlined"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                  />
                </Grid>
                <Grid item>
                  <TextField
                    id="registerPasswordConfirmation"
                    label={t('passwordConfirmation')}
                    fullWidth="true"
                    margin="normal"
                    type="password"
                    variant="outlined"
                    value={registerPasswordConfirmation}
                    onChange={(e) => setRegisterPasswordConfirmation(e.target.value)}
                    required
                  />
                </Grid>
                <Grid item>
                  <TextField
                    id="registerEmail"
                    label={t('email')}
                    fullWidth="true"
                    margin="normal"
                    variant="outlined"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                  />
                </Grid>
                <Grid item>
                  <TextField
                    id="registerDiscord"
                    label={t('discordNickname')}
                    fullWidth="true"
                    margin="normal"
                    variant="outlined"
                    value={registerDiscord}
                    onChange={(e) => setRegisterDiscord(e.target.value)}
                  />
                </Grid>
                {serverSettings.manualAreas.length > 0 && (
                  <Grid item>
                    <FormControl
                      fullWidth="true"
                      margin="normal"
                      variant="outlined"
                      required
                    >
                      <InputLabel htmlFor="registerArea">{t('area')}</InputLabel>
                      <Select
                        native
                        value={registerArea}
                        onChange={(e) => setRegisterArea(e.target.value)}
                        label={t('area')}
                        inputProps={{
                          name: 'registerArea',
                          id: 'registerArea',
                        }}
                      >
                        <option aria-label="None" value="" />
                        {serverSettings.manualAreas.map(area => (
                          <option value={area}>{area}</option>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                <Grid item>
                  <Button
                    variant="contained"
                    style={{
                      backgroundColor: 'rgb(255,153,0)',
                      color: 'white',
                      margin: '10px',
                    }}
                    size="large"
                    onClick={validateRegisterForm}
                  >
                    <Typography variant="h6" align="center">
                      {t('register')}
                    </Typography>
                  </Button>
                </Grid>
              </Grid>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRegisterFormClose} color="primary" autoFocus>
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default withRouter(Login)
