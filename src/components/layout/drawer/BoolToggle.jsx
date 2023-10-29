// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Switch from '@mui/material/Switch'

import { useStore } from '@hooks/useStore'
import { useTranslation } from 'react-i18next'
import { fromSnakeCase } from '@services/functions/fromSnakeCase'
import dlv from 'dlv'
import { setDeep } from '@services/functions/setDeep'

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
  const value = useStore((s) => dlv(s, field))
  const { t } = useTranslation()

  const onChange = React.useCallback(
    (
      /** @type {React.ChangeEvent<HTMLInputElement>} */ _,
      /** @type {boolean} */ checked,
    ) => {
      useStore.setState((prev) => setDeep(prev, field, checked))
    },
    [field],
  )
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
        onChange={onChange}
        checked={!!value}
        disabled={disabled}
      />
    </ListItem>
  )
}
