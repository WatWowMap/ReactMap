import React from 'react'
import { Select, MenuItem } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useStore } from '@hooks/useStore'

export default function LocaleSelection() {
  const { t, i18n } = useTranslation()
  const locale =
    useStore((s) => s.settings?.locale) ||
    localStorage.getItem('i18nextLng') ||
    'en'
  return (
    <Select
      autoFocus
      name="localeSelection"
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
  )
}
