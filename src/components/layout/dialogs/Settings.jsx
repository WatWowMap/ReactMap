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
import { useStore } from '../../../hooks/useStore'
import useStyles from '../../../assets/mui/styling'

export default function Settings({
  toggleDialog,
}) {
  const classes = useStyles()
  const config = useStore(state => state.config)
  const settings = useStore(state => state.settings)
  const setSettings = useStore(state => state.setSettings)

  const handleChange = event => {
    const configName = event.target.name === 'iconStyle' ? 'icons' : 'tileServers'
    setSettings({
      ...settings,
      [event.target.name]: config[configName][event.target.value],
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
                  value={settings.tileServer.name}
                  onChange={handleChange}
                >
                  {Object.keys(config.tileServers).map(tile => (
                    <MenuItem
                      key={tile}
                      value={tile}
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
                  value={settings.iconStyle.name}
                  onChange={handleChange}
                >
                  {Object.keys(config.icons).map(icon => (
                    <MenuItem
                      key={icon}
                      value={icon}
                    >
                      {config.icons[icon].name}
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
