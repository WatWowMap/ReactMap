// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Switch from '@mui/material/Switch'

import { useStore } from '@hooks/useStore'
import { useTranslation } from 'react-i18next'
import { fromSnakeCase } from '@services/functions/fromSnakeCase'

/**
 * @param {{
 *  field: string,
 *  label?: string,
 *  disabled?: boolean,
 *  children?: React.ReactNode,
 * }} props
 * @returns {JSX.Element}
 */
export default function BoolToggle({
  field,
  label,
  disabled = false,
  children,
}) {
  const value = useStore((s) => s[field])
  const { t } = useTranslation()

  return (
    <ListItem>
      {children}
      <ListItemText
        primary={
          t(label, fromSnakeCase(label)) ?? t(field, fromSnakeCase(field))
        }
      />
      <Switch
        edge="end"
        onChange={(_e, v) => useStore.setState({ [field]: v })}
        checked={!!value}
        disabled={disabled}
      />
    </ListItem>
  )
}
