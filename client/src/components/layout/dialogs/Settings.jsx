import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import {
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select
} from '@material-ui/core'

const useStyles = makeStyles((theme) => ({
  form: {
    display: 'flex',
    flexDirection: 'column',
    margin: 'auto',
    width: 'fit-content',
  },
  formControl: {
    marginTop: theme.spacing(2),
    minWidth: 120,
  },
  formControlLabel: {
    marginTop: theme.spacing(1),
  },
}))

const Settings = ({ config, settings, setSettings, toggleDialog }) => {
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
              <FormControl className={classes.formControl}>
                <InputLabel htmlFor="max-width">Map Style</InputLabel>
                <Select
                  autoFocus
                  name='tileServer'
                  value={settings.tileServer}
                  onChange={handleChange}
                >
                  {Object.keys(config.tileServers).map(tile => {
                    return (
                      <MenuItem
                        key={tile}
                        value={config.tileServers[tile]}>
                        {config.tileServers[tile].name}
                      </MenuItem>
                    )
                  })}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl className={classes.formControl}>
                <InputLabel htmlFor="max-width">Icon Style</InputLabel>
                <Select
                  autoFocus
                  name='iconStyle'
                  value={settings.iconStyle}
                  onChange={handleChange}
                >
                  {Object.keys(config.icons).map(icon => {
                    return (
                      <MenuItem
                        key={icon}
                        value={config.icons[icon]}>
                        {icon}
                      </MenuItem>
                    )
                  })}
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

export default Settings