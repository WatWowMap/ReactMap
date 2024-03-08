// @ts-check
import * as React from 'react'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import SaveIcon from '@mui/icons-material/Save'
import { useMutation } from '@apollo/client'
import { useTranslation } from 'react-i18next'

import { SAVE_COMPONENT } from '@services/queries/config'

import { usePlayStore } from '../hooks/store'

export function Save() {
  const { t } = useTranslation()

  const valid = usePlayStore((s) => s.valid)

  const [sendSave, { data, loading, error }] = useMutation(SAVE_COMPONENT)

  const handleSave = () => {
    const { code, component } = usePlayStore.getState()
    sendSave({ variables: { code, component } })
  }

  React.useEffect(() => {
    if (loading || error || data) {
      usePlayStore.setState((prev) => ({
        success: data?.saveComponent,
        loading,
        error,
        menuAnchorEl: null,
        original: prev.code,
      }))
    }
  }, [loading, error, data])

  return (
    <MenuItem dense onClick={handleSave} disabled={!valid}>
      <ListItemIcon>
        <SaveIcon />
      </ListItemIcon>
      <ListItemText>{t('save')}</ListItemText>
    </MenuItem>
  )
}
