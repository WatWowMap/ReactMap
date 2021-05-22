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
      [event.target.name]: config[event.target.name][event.target.value],
    })
  }

  const clearStorage = () => {
    localStorage.clear()
    setAlert(true)
  }

  const handleClose = () => {
    setAlert(false)
  }

  return (
    <Grid
      container
      direction="row"
      justify="space-evenly"
      alignItems="center"
      spacing={1}
    >
      {Object.keys(settings).map(setting => (
        <Grid item key={setting} xs={10}>
          <FormControl style={{ width: 200, margin: 5 }}>
            <InputLabel>{Utility.getProperName(setting)}</InputLabel>
            <Select
              autoFocus
              name={setting}
              value={settings[setting].name}
              onChange={handleChange}
              fullWidth
            >
              {Object.keys(config[setting]).map(option => (
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
          Clear Storage
        </Button>
      </Grid>
      <Grid item xs={5} style={{ textAlign: 'center', margin: '20px 0px' }}>
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
