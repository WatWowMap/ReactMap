// @ts-check
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import PermIdentityIcon from '@mui/icons-material/PermIdentity'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import RuleIcon from '@mui/icons-material/Rule'
import ClearIcon from '@mui/icons-material/Clear'
import CheckIcon from '@mui/icons-material/Check'

import { useStorage } from '@store/useStorage'

import { FCSelect } from './FCSelect'

const human = <PermIdentityIcon fontSize="small" color="info" />
const ai = <PrecisionManufacturingIcon fontSize="small" color="error" />
const partial = <RuleIcon fontSize="small" color="warning" />
const error = <ClearIcon fontSize="small" color="error" />
const success = <CheckIcon fontSize="small" color="success" />

export function LocaleSelection() {
  const { t, i18n } = useTranslation()
  const selectRef = React.useRef(/** @type {HTMLDivElement | null} */ (null))

  return (
    <FCSelect
      ref={selectRef}
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
          <MenuItem
            key={option}
            value={option}
            dense
            className="flex-center"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              whiteSpace: 'normal',
              width: selectRef.current?.clientWidth || 'auto',
            }}
          >
            {t(`locale_selection_${option}`)}
            <Typography
              variant="caption"
              className="flex-center"
              justifyContent="space-between"
              width="100%"
            >
              {status.total === 100
                ? success
                : status.total > 50
                ? partial
                : error}
              &nbsp;{status.total}%&nbsp;{human}&nbsp;{status.human}
              %&nbsp;{ai}&nbsp;{status.ai}%
            </Typography>
          </MenuItem>
        )
      })}
    </FCSelect>
  )
}
