import React from 'react'
import shallow from 'zustand/shallow'
import {
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
} from '@material-ui/core'
import { useTranslation } from 'react-i18next'

import { useStore, useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { config, setIcons: setStaticIcons } = useStatic.getState()
  const { setIcons, setSettings } = useStore.getState()

  const { Icons, settings: staticSettings } = useStatic((s) => s, shallow)
  const { settings, icons } = useStore((state) => state, shallow)

  const handleChange = (event) => {
    setSettings({
      ...settings,
      [event.target.name]: config[event.target.name][event.target.value].name,
    })
    if (event.target.name === 'localeSelection') {
      i18n.changeLanguage(event.target.value)
    }
  }

  const handleIconChange = (event) => {
    const { name, value } = event.target
    Icons.setSelection(name, value)
    setStaticIcons(Icons)
    setIcons({ ...icons, [name]: value })
  }

  return (
    <Grid
      container
      direction="row"
      justifyContent="space-evenly"
      alignItems="center"
      spacing={1}
    >
      {Object.keys(staticSettings).map((setting) => (
        <Grid item key={setting} xs={10}>
          <FormControl style={{ width: 200, margin: 5 }}>
            <InputLabel>{t(Utility.camelToSnake(setting))}</InputLabel>
            <Select
              autoFocus
              name={setting}
              value={config[setting][settings[setting]]?.name || ''}
              onChange={handleChange}
              fullWidth
            >
              {Object.keys(config[setting]).map((option) => (
                <MenuItem key={option} value={option}>
                  {t(
                    `${Utility.camelToSnake(setting)}_${option.toLowerCase()}`,
                    Utility.getProperName(option),
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      ))}
      {Icons.customizable.map((category) => (
        <Grid item key={category} xs={10}>
          <FormControl style={{ width: 200, margin: 5 }}>
            <InputLabel>
              {t(`${category}_icons`, `${category} Icons`)}
            </InputLabel>
            <Select
              autoFocus
              name={category}
              value={icons[category]}
              onChange={handleIconChange}
              fullWidth
            >
              {Icons[category].map((option) => (
                <MenuItem key={option} value={option}>
                  {t(
                    `${category.toLowerCase()}_${option.toLowerCase()}`,
                    Utility.getProperName(option),
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      ))}
    </Grid>
  )
}
