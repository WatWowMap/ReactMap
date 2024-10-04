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

const human = <PermIdentityIcon color="info" fontSize="small" />
const ai = <PrecisionManufacturingIcon color="error" fontSize="small" />
const partial = <RuleIcon color="warning" fontSize="small" />
const error = <ClearIcon color="error" fontSize="small" />
const success = <CheckIcon color="success" fontSize="small" />

export function LocaleSelection() {
  const { t, i18n } = useTranslation()
  const [width, setWidth] = React.useState(0)

  return (
    <FCSelect
      label={t('locale_selection')}
      renderValue={(v) => t(`locale_selection_${v}`)}
      setWidth={setWidth}
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
            dense
            className="flex-center"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              whiteSpace: 'normal',
              width: width || 'auto',
            }}
            value={option}
          >
            {t(`locale_selection_${option}`)}
            <Typography
              className="flex-center"
              justifyContent="space-between"
              variant="caption"
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
