import * as React from 'react'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { useTranslation } from 'react-i18next'

import { useLocalesStore } from '../hooks/store'

export function AllSwitch() {
  const { t } = useTranslation()
  const all = useLocalesStore((s) => s.all)
  return (
    <FormControlLabel
      control={
        <Switch
          checked={all}
          onChange={(_, checked) => useLocalesStore.setState({ all: checked })}
        />
      }
      label={t('all')}
    />
  )
}
