import React, { useState } from 'react'
import {
  FormControl, Grid, InputLabel, MenuItem, Select, Button,
} from '@material-ui/core'
import { Link, Redirect } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useStore, useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'

export default function Settings({ Icons }) {
  const { t, i18n } = useTranslation()
  const config = useStatic(state => state.config)
  const staticSettings = useStatic(state => state.settings)
  const { loggedIn, methods } = useStatic(state => state.auth)
  const setStaticIcons = useStatic(state => state.setIcons)
  const setUserProfile = useStatic(state => state.setUserProfile)
  const setFeedback = useStatic(state => state.setFeedback)

  const setTutorial = useStore(state => state.setTutorial)
  const settings = useStore(state => state.settings)
  const setSettings = useStore(state => state.setSettings)
  const icons = useStore(state => state.icons)
  const setIcons = useStore(state => state.setIcons)

  const [redirect, setRedirect] = useState(false)

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
    setTimeout(() => window.location.reload(), 1500)
  }

  if (redirect) {
    return <Redirect push to="/reset" />
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
            <InputLabel>{t(Utility.camelToSnake(setting))}</InputLabel>
            <Select
              autoFocus
              name={setting}
              value={config[setting][settings[setting]]?.name}
              onChange={handleChange}
              fullWidth
            >
              {Object.keys(config[setting]).map(option => (
                <MenuItem
                  key={option}
                  value={option}
                >
                  {t(`${Utility.camelToSnake(setting)}_${option.toLowerCase()}`, Utility.getProperName(option))}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      ))}
      {Icons.customizable.map(category => (
        <Grid item key={category} xs={10}>
          <FormControl style={{ width: 200, margin: 5 }}>
            <InputLabel>{t(`${category}_icons`, `${category} Icons`)}</InputLabel>
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
                  {t(`${category.toLowerCase()}_${option.toLowerCase()}`, Utility.getProperName(option))}
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
        {config.map.enableUserProfile && (
          <Grid item xs={t('drawer_settings_profile_width')} style={{ textAlign: 'center' }}>
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
        )}
        {Boolean(methods.length) && (
          <Grid item xs={t('drawer_settings_logout_width')} style={{ textAlign: 'center' }}>
            {loggedIn ? (
              <Button
                className="sidebar-button"
                variant="contained"
                style={{ minWidth: 100 }}
                color="primary"
                size="small"
                href="/logout"
              >
                {t('logout')}
              </Button>
            ) : (
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <Button
                  className="sidebar-button"
                  variant="contained"
                  style={{ minWidth: 100 }}
                  color="primary"
                  size="small"
                >
                  {t('login')}
                </Button>
              </Link>
            )}
          </Grid>
        )}
        {config.map.enableTutorial && (
          <Grid item xs={t('drawer_settings_tutorial_width')} style={{ textAlign: 'center' }}>
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
        )}
        <Grid item xs={t('drawer_settings_reset_filters_width')} style={{ textAlign: 'center' }}>
          <Button
            style={{ minWidth: 100 }}
            variant="contained"
            color="primary"
            size="small"
            onClick={() => setRedirect(true)}
          >
            {t('reset_filters')}
          </Button>
        </Grid>
        <Grid item xs={t('drawer_settings_export_settings_width')} style={{ textAlign: 'center' }}>
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
        <Grid item xs={t('drawer_settings_import_settings_width')} style={{ textAlign: 'center' }}>
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
        {config.map.statsLink
          && (
            <Grid item xs={t('drawer_settings_stats_width')} style={{ textAlign: 'center' }}>
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
        {config.map.feedbackLink
          && (
            <Grid item xs={t('drawer_settings_feedback_width')} style={{ textAlign: 'center' }}>
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
    </Grid>
  )
}
