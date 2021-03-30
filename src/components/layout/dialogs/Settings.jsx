import React from 'react'
import {
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
} from '@material-ui/core'

import useStyles from '../../../assets/mui/styling'

export default function Settings({
  config, settings, setSettings, toggleDialog,
}) {
  const classes = useStyles()

  const handleChange = event => {
    setSettings({
      ...settings,
      [event.target.name]: event.target.value,
    })
  }

  return (
    <>
      <DialogTitle id="max-width-dialog-title">Settings</DialogTitle>
      <DialogContent>
        <form className={classes.form} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl className={classes.formControlSettings}>
                <InputLabel htmlFor="max-width">Map Style</InputLabel>
                <Select
                  autoFocus
                  name="tileServer"
                  value={settings.tileServer}
                  onChange={handleChange}
                >
                  {Object.keys(config.tileServers).map(tile => (
                    <MenuItem
                      key={tile}
                      value={config.tileServers[tile]}
                    >
                      {config.tileServers[tile].name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl className={classes.formControlSettings}>
                <InputLabel htmlFor="max-width">Icon Style</InputLabel>
                <Select
                  autoFocus
                  name="iconStyle"
                  value={settings.iconStyle}
                  onChange={handleChange}
                >
                  {Object.keys(config.icons).map(icon => (
                    <MenuItem
                      key={icon}
                      value={config.icons[icon]}
                    >
                      {icon}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={toggleDialog(false)} color="primary">
          Close
        </Button>
      </DialogActions>
    </>
  )
}
