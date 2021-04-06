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
import useStore from '../../../hooks/useStore'
import useStyles from '../../../assets/mui/styling'

export default function Settings({
  settings, setSettings, toggleDialog,
}) {
  const classes = useStyles()
  const config = useStore(state => state.config)
  const handleChange = event => {
    const parsed = JSON.parse(event.target.value)
    setSettings({
      ...settings,
      [event.target.name]: parsed,
    })
    localStorage.setItem(event.target.name, JSON.stringify(parsed))
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
                  value={JSON.stringify(settings.tileServer)}
                  onChange={handleChange}
                >
                  {Object.keys(config.tileServers).map(tile => (
                    <MenuItem
                      key={tile}
                      value={JSON.stringify(config.tileServers[tile])}
                    >
                      {tile}
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
                  value={JSON.stringify(settings.iconStyle)}
                  onChange={handleChange}
                >
                  {Object.keys(config.icons).map(icon => (
                    <MenuItem
                      key={icon}
                      value={JSON.stringify(config.icons[icon])}
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
