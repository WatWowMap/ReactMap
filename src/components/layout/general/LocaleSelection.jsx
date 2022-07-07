import React from 'react'
import { Select, MenuItem } from '@material-ui/core'
import { useTranslation } from 'react-i18next'

export default function LocaleSelection({ localeSelection }) {
  const { t, i18n } = useTranslation()

  return (
    <Select
      autoFocus
      name="localeSelection"
      value={localStorage.getItem('i18nextLng') || 'en'}
      onChange={(event) => i18n.changeLanguage(event.target.value)}
      fullWidth
    >
      {Object.keys(localeSelection).map((option) => (
        <MenuItem key={option} value={option}>
          {t(`locale_selection_${option}`)}
        </MenuItem>
      ))}
    </Select>
  )
}
