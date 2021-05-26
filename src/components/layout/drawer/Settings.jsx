/* eslint-disable react/jsx-props-no-spreading */
import React, { useState } from 'react'
import {
  FormControl, Grid, InputLabel, MenuItem, Select, Button, Icon, Snackbar, Slide,
} from '@material-ui/core'
import { Alert } from '@material-ui/lab'

import { useStore, useStatic } from '../../../hooks/useStore'
import Utility from '../../../services/Utility'

function SlideTransition(props) {
  return <Slide {...props} direction="up" />
}

export default function Settings() {
  const config = useStatic(state => state.config)
  const settings = useStore(state => state.settings)
  const setSettings = useStore(state => state.setSettings)

  const [alert, setAlert] = useState(false)

  const handleChange = event => {
    setSettings({
      ...settings,
      [event.target.name]: config[event.target.name][event.target.value].name,
    })
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
      {Object.entries(settings).map(setting => {
        const [key, value] = setting
        return (
          <Grid item key={key} xs={10}>
            <FormControl style={{ width: 200, margin: 5 }}>
              <InputLabel>{Utility.getProperName(key)}</InputLabel>
              <Select
                autoFocus
                name={key}
                value={config[key][value].name}
                onChange={handleChange}
                fullWidth
              >
                {Object.keys(config[key]).map(option => (
                  <MenuItem
                    key={option}
                    value={option}
                  >
                    {Utility.getProperName(option)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )
      })}
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
          Clear Storage
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
            Import
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
          Logout
        </Button>
      </Grid>
      <Grid item xs={5} style={{ textAlign: 'center', marginBottom: '20px' }}>
        <Button
          variant="contained"
          color="secondary"
          size="small"
          onClick={exportSettings}
        >
          Export
        </Button>
      </Grid>
      <Snackbar
        open={alert}
        onClose={handleClose}
        TransitionComponent={SlideTransition}
      >
        <Alert onClose={handleClose} severity="success" variant="filled">
          Local Storage has been cleared!
        </Alert>
      </Snackbar>
    </Grid>
  )
}
