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
 *  onChange?: import('@mui/material/Switch').SwitchProps['onChange'],
 * }} props
 * @returns {JSX.Element}
 */
export default function BoolToggle({
  field,
  label,
  disabled = false,
  children,
  onChange,
}) {
  const value = useStore((s) => dlv(s, field))
  const { t } = useTranslation()

  const onChangeWrapper = React.useCallback(
    (
      /** @type {React.ChangeEvent<HTMLInputElement>} */ _,
      /** @type {boolean} */ checked,
    ) => {
      useStore.setState((prev) => setDeep(prev, field, checked))
      if (onChange) onChange(_, checked)
    },
    [field],
  )
  return (
    <ListItem>
      {children}
      <ListItemText sx={{ maxWidth: 150 }}>
        {t(label, fromSnakeCase(label)) ?? t(field, fromSnakeCase(field))}
      </ListItemText>
      <Switch
        edge="end"
        onChange={onChangeWrapper}
        checked={!!value}
        disabled={disabled}
      />
    </ListItem>
  )
}
