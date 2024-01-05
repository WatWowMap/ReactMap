// @ts-check
import * as React from 'react'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Switch from '@mui/material/Switch'
import List from '@mui/material/List'

import { useDeepStore } from '@hooks/useStore'
import { useTranslation } from 'react-i18next'
import Grid2 from '@mui/material/Unstable_Grid2/Grid2'
import Utility from '@services/Utility'
import { fromSnakeCase } from '@services/functions/fromSnakeCase'

/**
 * @typedef {{
 *  field: import('@hooks/useStore').UseStorePaths,
 *  label?: string,
 *  disabled?: boolean,
 *  children?: React.ReactNode,
 *  align?: import('@mui/material').TypographyProps['align']
 * } & import('@mui/material').ListItemProps} BoolToggleProps
 */

/** @param {BoolToggleProps} props */
export function BoolBase({
  field,
  label = field.split('.').at(-1),
  disabled = false,
  children,
  align,
  ...props
}) {
  const { t } = useTranslation()
  const [value, setValue] = useDeepStore(field, false)
  const onChange =
    /** @type {import('@mui/material').SwitchProps['onChange']} */ (
      React.useCallback((_, checked) => setValue(checked), [field])
    )
  return (
    <ListItem {...props}>
      {children}
      <ListItemText primaryTypographyProps={{ align }}>
        {t(label, t(Utility.camelToSnake(label), fromSnakeCase(label)))}
      </ListItemText>
      <Switch onChange={onChange} checked={!!value} disabled={disabled} />
    </ListItem>
  )
}

export const BoolToggle = React.memo(
  BoolBase,
  (prev, next) => prev.disabled === next.disabled && prev.field === next.field,
)

/** @param {{ items: readonly [string, string] } & BoolToggleProps} props */
export function DualBoolToggle({ items, field, ...props }) {
  return (
    <Grid2 container component={ListItem} disablePadding disableGutters>
      {items.map((item) => (
        <Grid2 key={item} xs={6} component={List}>
          <BoolToggle
            // @ts-ignore
            field={`${field}.${item}`}
            label={item}
            disablePadding
            disableGutters
            align="center"
            {...props}
          />
        </Grid2>
      ))}
    </Grid2>
  )
}
