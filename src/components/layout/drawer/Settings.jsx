import React, { useState } from 'react'
import {
  FormControl, Grid, InputLabel, MenuItem, Select, Button, Icon, Snackbar, Slide, Dialog,
} from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useStore, useStatic } from '../../../hooks/useStore'
import UserProfile from '../dialogs/UserProfile'
import Tutorial from '../dialogs/tutorial/Tutorial'

function SlideTransition(props) {
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <Slide {...props} direction="up" />
}

export default function Settings({ toggleDialog }) {
  const config = useStatic(state => state.config)
  const settings = useStore(state => state.settings)
  const setSettings = useStore(state => state.setSettings)
  const staticSettings = useStatic(state => state.settings)
  const { discord, loggedIn } = useStatic(state => state.auth)
  const setAvailableForms = useStatic(state => state.setAvailableForms)
  const { t, i18n } = useTranslation()

  const [alert, setAlert] = useState(false)
  const [userProfile, setUserProfile] = useState(false)
  const tutorial = useStore(state => state.tutorial)
  const setTutorial = useStore(state => state.setTutorial)

  const handleChange = event => {
    setSettings({
      ...settings,
      [event.target.name]: config[event.target.name][event.target.value].name,
    })
    if (event.target.name === 'localeSelection') {
      i18n.changeLanguage(event.target.value)
    }
    if (event.target.name === 'icons') {
      setAvailableForms(new Set(config[event.target.name][event.target.value].pokemonList))
    }
  }

  const clearStorage = () => {
    localStorage.clear()
    window.location.reload()
    setAlert(true)
  }

  const handleClose = () => {
    setAlert(false)
  }

  const exportSettings = () => {
    const json = localStorage.getItem('local-state')
    const el = document.createElement('a')
    el.setAttribute('href', `data:application/json;chartset=utf-8,${encodeURIComponent(json)}`)
    el.setAttribute('download', 'settings.json')
    el.style.display = 'none'
    document.body.appendChild(el)
    el.click()
    document.body.removeChild(el)
  }

  const importSettings = (e) => {
    const file = e.target.files[0]
    if (!file) {
      return
    }
    const reader = new FileReader()
    reader.onload = function parse(newSettings) {
      const contents = newSettings.target.result
      localStorage.clear()
      localStorage.setItem('local-state', contents)
    }
    reader.readAsText(file)
    window.location.reload()
  }

  return (
    <Grid
      container
      direction="row"
      justify="space-evenly"
      alignItems="center"
      spacing={1}
    >
      {Object.keys(staticSettings).map(setting => (
        <Grid item key={setting} xs={10}>
          <FormControl style={{ width: 200, margin: 5 }}>
            <InputLabel>{t(setting)}</InputLabel>
            <Select
              autoFocus
              name={setting}
              value={config[setting][settings[setting]].name}
              onChange={handleChange}
              fullWidth
            >
              {Object.keys(config[setting]).map(option => (
                <MenuItem
                  key={option}
                  value={option}
                >
                  {t(`${setting}${option}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      ))}
      <Grid
        justify="space-evenly"
        alignItems="center"
        container
        item
        spacing={3}
        style={{ margin: '10px 0px' }}
      >
        <Grid item xs={6} style={{ textAlign: 'center' }}>
          <Button
            style={{ minWidth: 100 }}
            variant="contained"
            color="secondary"
            size="small"
            onClick={() => setUserProfile(true)}
          >
            {t('profile')}
          </Button>
        </Grid>
        {discord && (
          <Grid item xs={6} style={{ textAlign: 'center' }}>
            {loggedIn ? (
              <Button
                className="sidebar-button"
                variant="contained"
                style={{
                  backgroundColor: 'rgb(114,136,218)',
                  color: 'white',
                  minWidth: 100,
                }}
                size="small"
                href="/logout"
              >
                <Icon className="fab fa-discord" style={{ fontSize: 20 }} />&nbsp;
                {t('logout')}
              </Button>
            ) : (
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Button
                  className="sidebar-button"
                  variant="contained"
                  style={{
                    backgroundColor: 'rgb(114,136,218)',
                    color: 'white',
                    minWidth: 100,
                  }}
                  size="small"
                >
                  <Icon className="fab fa-discord" style={{ fontSize: 20 }} />&nbsp;
                  {t('login')}
                </Button>
              </Link>
            )}
          </Grid>
        )}
        <Grid item xs={6} style={{ textAlign: 'center' }}>
          <Button
            style={{ minWidth: 100 }}
            variant="contained"
            color="secondary"
            size="small"
            onClick={() => setTutorial(true)}
          >
            {t('tutorial')}
          </Button>
        </Grid>
        <Grid item xs={discord ? 6 : 12} style={{ textAlign: 'center' }}>
          <Button
            style={{ minWidth: 100 }}
            variant="contained"
            color="primary"
            size="small"
            onClick={clearStorage}
          >
            {t('resetFilters')}
          </Button>
        </Grid>
        <Grid item xs={6} style={{ textAlign: 'center' }}>
          <Button
            style={{ minWidth: 100 }}
            variant="contained"
            color="secondary"
            size="small"
            onClick={exportSettings}
          >
            {t('export')}
          </Button>
        </Grid>
        <Grid item xs={6} style={{ textAlign: 'center' }}>
          <input
            accept="application/json"
            id="contained-button-file"
            type="file"
            style={{ display: 'none' }}
            onChange={importSettings}
          />
          <label htmlFor="contained-button-file">
            <Button
              style={{ minWidth: 100 }}
              variant="contained"
              color="primary"
              component="span"
              size="small"
            >
              {t('import')}
            </Button>
          </label>
        </Grid>
      </Grid>
      <Snackbar
        open={alert}
        onClose={handleClose}
        TransitionComponent={SlideTransition}
      >
        <Alert onClose={handleClose} severity="success" variant="filled">
          {t('localStorageCleared')}
        </Alert>
      </Snackbar>
      <Dialog open={userProfile} fullWidth>
        <UserProfile setUserProfile={setUserProfile} />
      </Dialog>
      <Dialog open={tutorial}>
        <Tutorial setUserProfile={setUserProfile} setTutorial={setTutorial} toggleDialog={toggleDialog} />
      </Dialog>
    </Grid>
  )
}
