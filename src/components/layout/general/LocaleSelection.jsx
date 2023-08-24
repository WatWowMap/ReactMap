import * as React from 'react'
import { useTranslation } from 'react-i18next'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

import { useStore } from '@hooks/useStore'

export default function LocaleSelection() {
  const { t, i18n } = useTranslation()
  const locale =
    useStore((s) => s.settings?.locale) ||
    localStorage.getItem('i18nextLng') ||
    'en'
  return (
    <FormControl size="small" fullWidth style={{ margin: '3px 0' }}>
      <InputLabel>{t('locale_selection')}</InputLabel>
      <Select
        autoFocus
        label={t('locale_selection')}
        value={locale}
        onChange={(event) => {
          i18n.changeLanguage(event.target.value)
          useStore.setState((prev) => ({
            settings: { ...prev.settings, locale: event.target.value },
          }))
        }}
        fullWidth
      >
        {CONFIG.client.locales.map((option) => (
          <MenuItem key={option} value={option} dense>
            {t(`locale_selection_${option}`)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}
