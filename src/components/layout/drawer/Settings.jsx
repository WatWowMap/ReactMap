/* eslint-disable react/jsx-props-no-spreading */
import React, { useState } from 'react'
import {
  FormControl, Grid, InputLabel, MenuItem, Select, Button, Icon, Snackbar, Slide,
} from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { useTranslation } from 'react-i18next'

import { useStore, useStatic } from '../../../hooks/useStore'

function SlideTransition(props) {
  return <Slide {...props} direction="up" />
}

export default function Settings() {
  const config = useStatic(state => state.config)
  const settings = useStore(state => state.settings)
  const setSettings = useStore(state => state.setSettings)
  const staticSettings = useStatic(state => state.settings)
  const { t, i18n } = useTranslation()

  const [alert, setAlert] = useState(false)

  const handleChange = event => {
    setSettings({
      ...settings,
      [event.target.name]: config[event.target.name][event.target.value].name,
    })
    if (event.target.name === 'localeSelection') {
      i18n.changeLanguage(event.target.value)
    }
  }

  const clearStorage = () => {
    localStorage.clear()
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
      <Grid item xs={6} style={{ textAlign: 'center', margin: '20px 0px' }}>
        <Button
          variant="contained"
          color="primary"
          style={{
            color: 'white',
          }}
          size="small"
          onClick={clearStorage}
        >
          {t('clearStorage')}
        </Button>
      </Grid>
      <Grid item xs={5} style={{ textAlign: 'center' }}>
        <input
          accept="application/json"
          id="contained-button-file"
          type="file"
          style={{ display: 'none' }}
          onChange={importSettings}
        />
        <label htmlFor="contained-button-file">
          <Button
            variant="contained"
            color="primary"
            component="span"
            size="small"
          >
            {t('import')}
          </Button>
        </label>
      </Grid>
      <Grid item xs={6} style={{ textAlign: 'center', marginBottom: '20px' }}>
        <Button
          variant="contained"
          style={{
            backgroundColor: 'rgb(114,136,218)',
            color: 'white',
          }}
          size="small"
          href="/logout"
        >
          <Icon className="fab fa-discord" style={{ fontSize: 20 }} />&nbsp;
          {t('logout')}
        </Button>
      </Grid>
      <Grid item xs={5} style={{ textAlign: 'center', marginBottom: '20px' }}>
        <Button
          variant="contained"
          color="secondary"
          size="small"
          onClick={exportSettings}
        >
          {t('export')}
        </Button>
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
    </Grid>
  )
}
