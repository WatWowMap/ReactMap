import React from 'react'
import {
  FormControl, Grid, InputLabel, MenuItem, Select, Button, Icon, Typography,
} from '@material-ui/core'
import { useStore, useMasterfile } from '../../../hooks/useStore'
import Utility from '../../../services/Utility'

export default function Settings() {
  const config = useMasterfile(state => state.config)
  const settings = useStore(state => state.settings)
  const setSettings = useStore(state => state.setSettings)

  const handleChange = event => {
    setSettings({
      ...settings,
      [event.target.name]: config[event.target.name][event.target.value],
    })
  }

  return (
    <Grid
      container
      direction="column"
      justify="space-evenly"
      alignItems="center"
      spacing={1}
    >
      {Object.keys(settings).map(setting => (
        <Grid item key={setting}>
          <FormControl style={{ width: 175 }}>
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
      <Grid item>
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
          <Typography variant="button">
            Logout
          </Typography>
        </Button>
      </Grid>
    </Grid>
  )
}
