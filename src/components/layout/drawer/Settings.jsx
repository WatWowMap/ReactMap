import React, { useState } from 'react'
import {
  FormControl, Grid, InputLabel, MenuItem, Select, Button, Icon, Snackbar, Dialog,
} from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useStore, useStatic } from '@hooks/useStore'
import SlideTransition from '@assets/mui/SlideTransition'
import UserProfile from '../dialogs/UserProfile'
import Tutorial from '../dialogs/tutorial/Tutorial'
import Feedback from '../dialogs/Feedback'

export default function Settings({ toggleDialog, Icons }) {
  const { t, i18n } = useTranslation()
  const config = useStatic(state => state.config)
  const staticSettings = useStatic(state => state.settings)
  const { discord, loggedIn } = useStatic(state => state.auth)
  const tutorial = useStore(state => state.tutorial)
  const setTutorial = useStore(state => state.setTutorial)
  const settings = useStore(state => state.settings)
  const setSettings = useStore(state => state.setSettings)
  const icons = useStore(state => state.icons)
  const setIcons = useStore(state => state.setIcons)
  const setStaticIcons = useStatic(state => state.setIcons)
  const [alert, setAlert] = useState(false)
  const [userProfile, setUserProfile] = useState(false)
  const [feedback, setFeedback] = useState(false)

  const handleChange = event => {
    setSettings({
      ...settings,
      [event.target.name]: config[event.target.name][event.target.value].name,
    })
    if (event.target.name === 'localeSelection') {
      i18n.changeLanguage(event.target.value)
    }
  }

  const handleIconChange = event => {
    const { name, value } = event.target
    Icons.setSelection(name, value)
    setStaticIcons(Icons)
    setIcons({ ...icons, [name]: value })
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
      justifyContent="space-evenly"
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
      {Icons.customizable.map(category => (
        <Grid item key={category} xs={10}>
          <FormControl style={{ width: 200, margin: 5 }}>
            <InputLabel>{t(`${category}Icons`, `${category} Icons`)}</InputLabel>
            <Select
              autoFocus
              name={category}
              value={icons[category]}
              onChange={handleIconChange}
              fullWidth
            >
              {Icons[category].map(option => (
                <MenuItem
                  key={option}
                  value={option}
                >
                  {t(`${category}${option}`, option)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      ))}
      <Grid
        justifyContent="space-evenly"
        alignItems="center"
        container
        item
        spacing={3}
        style={{ margin: '10px 0px' }}
      >
        <Grid item xs={t('drawerSettingsProfileWidth')} style={{ textAlign: 'center' }}>
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
          <Grid item xs={t('drawerSettingsLogoutWidth')} style={{ textAlign: 'center' }}>
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
        <Grid item xs={t('drawerSettingsTutorialWidth')} style={{ textAlign: 'center' }}>
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
        <Grid item xs={discord ? t('drawerSettingsResetFiltersDiscordWidth') : t('drawerSettingsResetFiltersWidth')} style={{ textAlign: 'center' }}>
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
        <Grid item xs={t('drawerSettingsExportSettingsWidth')} style={{ textAlign: 'center' }}>
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
        <Grid item xs={t('drawerSettingsImportSettingsWidth')} style={{ textAlign: 'center' }}>
          <input
            accept="application/json"
            id="contained-button-file"
            type="file"
            style={{ display: 'none' }}
            onChange={importSettings}
          />
          <label htmlFor="contained-button-file">
            <Button
              component="span"
              style={{ minWidth: 100 }}
              variant="contained"
              color="primary"
              size="small"
            >
              {t('import')}
            </Button>
          </label>
        </Grid>
        {config.map.enableStats
          && (
            <Grid item xs={t('drawerSettingsStatsWidth')} style={{ textAlign: 'center' }}>
              <Button
                variant="contained"
                color="secondary"
                style={{ minWidth: 100 }}
                href={config.map.statsLink}
                target="_blank"
                rel="noreferrer"
                size="small"
              >
                {t('stats')}
              </Button>
            </Grid>
          )}
        {config.map.enableFeedback
          && (
            <Grid item xs={t('drawerSettingsFeedbackWidth')} style={{ textAlign: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                style={{ minWidth: 100 }}
                onClick={() => setFeedback(true)}
                size="small"
              >
                {t('feedback')}
              </Button>
            </Grid>
          )}
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
      <Dialog open={userProfile}>
        <UserProfile setUserProfile={setUserProfile} />
      </Dialog>
      <Dialog open={tutorial}>
        <Tutorial setUserProfile={setUserProfile} setTutorial={setTutorial} toggleDialog={toggleDialog} />
      </Dialog>
      <Dialog
        open={feedback}
        maxWidth="xs"
      >
        <Feedback link={config.map.feedbackLink} setFeedback={setFeedback} />
      </Dialog>
    </Grid>
  )
}
