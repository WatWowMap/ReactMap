// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import MenuItem from '@mui/material/MenuItem'

import { useStorage } from '@store/useStorage'

import { FCSelect } from './FCSelect'

export function LocaleSelection() {
  const { t, i18n } = useTranslation()
  return (
    <FCSelect
      label={t('locale_selection')}
      value={i18n.language}
      onChange={(event) => {
        i18n.changeLanguage(event.target.value)
        useStorage.setState((prev) => ({
          settings: { ...prev.settings, locale: event.target.value },
        }))
      }}
    >
      {CONFIG.client.locales.map((option) => (
        <MenuItem key={option} value={option} dense>
          {t(`locale_selection_${option}`)}
        </MenuItem>
      ))}
    </FCSelect>
  )
}
