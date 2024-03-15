// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import MenuItem from '@mui/material/MenuItem'
import Box from '@mui/material/Box'
import PermIdentityIcon from '@mui/icons-material/PermIdentity'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import RuleIcon from '@mui/icons-material/Rule'

import { useStorage } from '@store/useStorage'

import { FCSelect } from './FCSelect'

const human = <PermIdentityIcon fontSize="small" color="success" />
const ai = <PrecisionManufacturingIcon fontSize="small" color="error" />
const partial = <RuleIcon fontSize="small" color="warning" />

export function LocaleSelection() {
  const { t, i18n } = useTranslation()

  return (
    <FCSelect
      renderValue={(v) => t(`locale_selection_${v}`)}
      label={t('locale_selection')}
      value={i18n.language}
      onChange={(event) => {
        i18n.changeLanguage(event.target.value)
        useStorage.setState((prev) => ({
          settings: { ...prev.settings, locale: event.target.value },
        }))
      }}
    >
      {CONFIG.client.locales.map((option) => {
        const status = CONFIG.client.localeStatus[option]
        return (
          <MenuItem key={option} value={option} dense>
            {t(`locale_selection_${option}`)}
            <Box sx={{ flexGrow: 1 }} />
            {status.human
              ? human
              : status.partial
              ? partial
              : status.ai
              ? ai
              : null}
          </MenuItem>
        )
      })}
    </FCSelect>
  )
}
