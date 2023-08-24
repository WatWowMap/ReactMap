// @ts-check
import * as React from 'react'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import DownloadIcon from '@mui/icons-material/Download'
import { useTranslation } from 'react-i18next'

import { handleDownload, usePlayStore } from '../hooks/store'

export function Download() {
  const { t } = useTranslation()
  const valid = usePlayStore((s) => s.valid)
  return (
    <MenuItem
      dense
      color="secondary"
      onClick={handleDownload}
      disabled={!valid}
    >
      <ListItemIcon>
        <DownloadIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>{t('download')}</ListItemText>
    </MenuItem>
  )
}
